import { Router } from 'express'
import { rows, transaction } from './db.js'
import { actorById, isAdmin, publicActor } from './enrollment.js'
import { fail, hashPassword, phoneNumber, temporaryPassword } from './security.js'

const isId = (value) => typeof value === 'string' && /^[1-9]\d*$/.test(value)
const limits = 50
const teacherAssigned = 'EXISTS (SELECT 1 FROM class_admins assigned WHERE assigned.user_id=u.id)'

function accountScope(actor) {
  if (actor.role === 'system_admin') return { clause: "u.role<>'system_admin'", values: [] }
  const school = "u.school_id=? AND u.role='student'"
  if (actor.role === 'school_admin') return { clause: school, values: [actor.school_id] }
  return {
    clause: `${school} AND u.school_status='approved' AND NOT ${teacherAssigned}
      AND EXISTS (SELECT 1 FROM class_members cm JOIN class_admins ca ON ca.class_id=cm.class_id
        WHERE ca.user_id=? AND cm.user_id=u.id AND cm.status IN ('approved','pending'))`,
    values: [actor.school_id, actor.id],
  }
}

async function updatePhone(connection, userId, phone) {
  try {
    await rows('UPDATE users SET phone=? WHERE id=?', [phone, userId], connection)
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') fail(409, '该手机号已被使用')
    throw error
  }
}

export async function managedAccount(actor, userId, connection) {
  if (!isAdmin(actor) || !isId(userId)) return null
  const scope = accountScope(actor)
  const [target] = await rows(
    `SELECT u.id,u.school_id,u.school_status FROM users u WHERE u.id=? AND ${scope.clause}${connection ? ' FOR UPDATE' : ''}`,
    [userId, ...scope.values],
    connection,
  )
  return target || null
}

async function updateManagedAccount(req, change) {
  if (!isId(req.params.userId)) fail(400, '请选择有效的账号')
  await transaction(async (connection) => {
    const target = await managedAccount(req.actor, req.params.userId, connection)
    if (!target) fail(404, '账号不在管理范围内')
    await change(connection, target)
  })
}

export const accountRoutes = Router()

accountRoutes.patch('/my/phone', async (req, res) => {
  await updatePhone(undefined, req.actor.id, phoneNumber(req.body.phone))
  const actor = await actorById(req.actor.id)
  res.json(publicActor({ ...actor, impersonating: req.actor.impersonating }))
})

accountRoutes.use('/admin/accounts', (req, res, next) => {
  if (!isAdmin(req.actor)) fail(403, '当前账号没有管理权限')
  next()
})

accountRoutes.get('/admin/accounts', async (req, res) => {
  const scope = accountScope(req.actor)
  const keyword = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  const after = req.query.after || '0'
  if (after !== '0' && !isId(after)) fail(400, '账号列表游标无效')
  const list = await rows(
    `SELECT u.id,u.phone,u.nickname,u.school_id AS schoolId,s.name AS schoolName,
      CASE WHEN u.role='school_admin' THEN u.role WHEN ${teacherAssigned} THEN 'class_admin' ELSE 'student' END AS role,
      (SELECT GROUP_CONCAT(assigned.class_id) FROM class_admins assigned WHERE assigned.user_id=u.id) AS classKeys
      FROM users u LEFT JOIN schools s ON s.id=u.school_id
      WHERE ${scope.clause} AND u.id>? AND (LOCATE(?,u.phone)>0 OR LOCATE(?,u.nickname)>0)
      ORDER BY u.id LIMIT ?`,
    [...scope.values, after, keyword, keyword, limits + 1],
  )
  const accounts = list.slice(0, limits).map(({ classKeys, ...item }) => ({
    ...item,
    classIds: classKeys ? classKeys.split(',') : [],
  }))
  res.json({ accounts, next: list.length > limits ? accounts.at(-1).id : null })
})

accountRoutes.patch('/admin/accounts/:userId/phone', async (req, res) => {
  const phone = phoneNumber(req.body.phone)
  await updateManagedAccount(req, (connection, target) => updatePhone(connection, target.id, phone))
  res.json({ phone })
})

accountRoutes.post('/admin/accounts/:userId/reset-password', async (req, res) => {
  const password = temporaryPassword()
  const hash = await hashPassword(password)
  await updateManagedAccount(req, (connection, target) =>
    rows('UPDATE users SET password_hash=? WHERE id=?', [hash, target.id], connection),
  )
  res.json({ temporaryPassword: password })
})

accountRoutes.patch('/admin/accounts/:userId/role', async (req, res) => {
  const { role, schoolId, classIds } = req.body
  const actor = req.actor
  const allowedRoles = {
    system_admin: ['student', 'class_admin', 'school_admin', 'system_admin'],
    school_admin: ['student', 'class_admin'],
  }
  if (!allowedRoles[actor.role]?.includes(role)) fail(403, '不能分配该角色')

  await updateManagedAccount(req, async (connection, target) => {
    if (role === 'school_admin') {
      if (!isId(schoolId)) fail(400, '请选择学校')
      if (target.school_status === 'approved' && target.school_id !== schoolId)
        fail(409, '该账号已加入其他学校')
      const [school] = await rows('SELECT id FROM schools WHERE id=?', [schoolId], connection)
      if (!school) fail(404, '学校不存在')
      await rows(
        "UPDATE users SET role='school_admin',school_id=?,school_status='approved' WHERE id=?",
        [schoolId, target.id],
        connection,
      )
    } else if (role === 'class_admin') {
      const teacherSchool = actor.role === 'system_admin' ? schoolId : actor.school_id
      if (!isId(teacherSchool)) fail(400, '请选择学校')
      if (target.school_status === 'approved' && target.school_id !== teacherSchool)
        fail(409, '该账号已加入其他学校')
      if (!Array.isArray(classIds) || !classIds.length || !classIds.every(isId))
        fail(400, '请选择教师负责的班级')
      const selected = [...new Set(classIds)]
      const classes = await rows(
        `SELECT id FROM classes WHERE school_id=? AND id IN (${selected.map(() => '?').join(',')})`,
        [teacherSchool, ...selected],
        connection,
      )
      if (classes.length !== selected.length) fail(403, '只能分配所选学校的班级')
      await rows(
        "UPDATE users SET role='student',school_id=?,school_status='approved' WHERE id=?",
        [teacherSchool, target.id],
        connection,
      )
      await rows('DELETE FROM class_admins WHERE user_id=?', [target.id], connection)
      await rows(
        `INSERT INTO class_admins (class_id,user_id) VALUES ${selected.map(() => '(?,?)').join(',')}`,
        selected.flatMap((id) => [id, target.id]),
        connection,
      )
      return
    } else await rows('UPDATE users SET role=? WHERE id=?', [role, target.id], connection)

    await rows('DELETE FROM class_admins WHERE user_id=?', [target.id], connection)
  })
  res.json({ ok: true })
})
