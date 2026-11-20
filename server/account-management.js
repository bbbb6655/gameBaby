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

async function updateManagedAccount(req, change) {
  const userId = req.params.userId
  if (!isId(userId)) fail(400, '请选择有效的账号')
  const scope = accountScope(req.actor)
  await transaction(async (connection) => {
    const [target] = await rows(
      `SELECT u.id FROM users u WHERE u.id=? AND ${scope.clause} FOR UPDATE`,
      [userId, ...scope.values],
      connection,
    )
    if (!target) fail(404, '账号不在管理范围内')
    await change(connection, target.id)
  })
}

export const accountRoutes = Router()

accountRoutes.patch('/my/phone', async (req, res) => {
  await updatePhone(undefined, req.actor.id, phoneNumber(req.body.phone))
  res.json(publicActor(await actorById(req.actor.id)))
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
    `SELECT u.id,u.phone,u.nickname,s.name AS schoolName,
      CASE WHEN u.role='school_admin' THEN u.role WHEN ${teacherAssigned} THEN 'class_admin' ELSE 'student' END AS role
      FROM users u LEFT JOIN schools s ON s.id=u.school_id
      WHERE ${scope.clause} AND u.id>? AND (LOCATE(?,u.phone)>0 OR LOCATE(?,u.nickname)>0)
      ORDER BY u.id LIMIT ?`,
    [...scope.values, after, keyword, keyword, limits + 1],
  )
  const accounts = list.slice(0, limits)
  res.json({ accounts, next: list.length > limits ? accounts.at(-1).id : null })
})

accountRoutes.patch('/admin/accounts/:userId/phone', async (req, res) => {
  const phone = phoneNumber(req.body.phone)
  await updateManagedAccount(req, (connection, id) => updatePhone(connection, id, phone))
  res.json({ phone })
})

accountRoutes.post('/admin/accounts/:userId/reset-password', async (req, res) => {
  const password = temporaryPassword()
  const hash = await hashPassword(password)
  await updateManagedAccount(req, (connection, id) =>
    rows('UPDATE users SET password_hash=? WHERE id=?', [hash, id], connection),
  )
  res.json({ temporaryPassword: password })
})
