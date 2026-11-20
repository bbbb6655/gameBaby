import { Router } from 'express'
import { DEMO_SMS_CODE } from '../src/registration.js'
import { rows, transaction } from './db.js'
import { fail, hashPassword, phoneNumber, temporaryPassword, text } from './security.js'

const asId = (value) => {
  const id = String(value ?? '')
  if (!/^[1-9]\d*$/.test(id)) fail(400, '请选择有效的记录')
  return id
}
const isSystem = (actor) => actor.role === 'system_admin'
const isSchool = (actor, schoolId) =>
  actor.role === 'school_admin' &&
  actor.school_id === String(schoolId) &&
  actor.school_status === 'approved'
export const isAdmin = (actor) =>
  isSystem(actor) || isSchool(actor, actor.school_id) || actor.adminClasses.length > 0
export const isApprovedStudent = (actor) =>
  actor.school_status === 'approved' && actor.enrollments.some((item) => item.status === 'approved')
export const canSeeName = (actor, classId) => actor.adminClasses.includes(String(classId))
const classAccess = (actor, details) =>
  isSystem(actor) || isSchool(actor, details.schoolId) || canSeeName(actor, details.id)

export async function actorById(id) {
  const [actor] = await rows(
    `SELECT u.id, u.phone, u.nickname, u.role, u.school_id, u.school_status, u.avatar_id, u.password_hash,
    s.name AS schoolName FROM users u LEFT JOIN schools s ON s.id=u.school_id WHERE u.id=?`,
    [id],
  )
  if (!actor) return null
  const [enrollments, assignments] = await Promise.all([
    rows(
      `SELECT c.id, c.name, c.cohort, m.name AS major, cm.status FROM class_members cm
      JOIN classes c ON c.id=cm.class_id JOIN majors m ON m.id=c.major_id
      WHERE cm.user_id=? AND c.school_id=? ORDER BY cm.requested_at DESC`,
      [id, actor.school_id],
    ),
    rows(
      `SELECT ca.class_id FROM class_admins ca JOIN classes c ON c.id=ca.class_id
      WHERE ca.user_id=? AND c.school_id=?`,
      [id, actor.school_id],
    ),
  ])
  actor.enrollments = enrollments
  actor.adminClasses = actor.school_status === 'approved' ? assignments.map((row) => row.class_id) : []
  return actor
}

export function publicActor(actor) {
  if (!actor) return null
  const {
    id,
    phone,
    nickname,
    role,
    school_id,
    schoolName,
    school_status,
    avatar_id,
    enrollments,
    adminClasses,
  } = actor
  return {
    id,
    phone,
    nickname,
    role,
    schoolId: school_id,
    schoolName,
    schoolStatus: school_status,
    avatarId: avatar_id,
    enrollments,
    adminClasses,
    canStudy: isApprovedStudent(actor),
    canManage: isAdmin(actor),
  }
}

async function takeUser(connection, userId) {
  const [user] = await rows(
    'SELECT id, school_id, school_status, role FROM users WHERE id=? FOR UPDATE',
    [userId],
    connection,
  )
  if (!user) fail(404, '用户不存在')
  return user
}

async function selectClass(classId) {
  const [item] = await rows(
    `SELECT c.id, c.school_id AS schoolId, c.major_id AS majorId, c.name, c.cohort,
    s.name AS school, m.name AS major FROM classes c JOIN schools s ON s.id=c.school_id JOIN majors m ON m.id=c.major_id
    WHERE c.id=?`,
    [asId(classId)],
  )
  if (!item) fail(404, '班级不存在')
  return item
}

async function selectedPlacement({ schoolId, majorId, cohort, classId }) {
  const school = asId(schoolId)
  const major = asId(majorId)
  const details = await selectClass(classId)
  if (details.schoolId !== school || details.majorId !== major || details.cohort !== cohort)
    fail(400, '所选学校、专业、届别和班级不匹配')
  return details
}

export async function registerStudent(body, cipher) {
  if (body?.smsCode !== DEMO_SMS_CODE) fail(400, '短信验证码错误')
  const details = await selectedPlacement(body)
  const phone = phoneNumber(body.phone)
  const nickname = text(body.nickname, '昵称', 80)
  const realName = cipher.encrypt(text(body.realName, '实名', 80))
  const passwordHash = await hashPassword(body.password)
  return transaction(async (connection) => {
    const { insertId } = await rows(
      `INSERT INTO users (phone,nickname,real_name_cipher,password_hash,school_id,school_status)
      VALUES (?,?,?,?,?,'pending')`,
      [phone, nickname, realName, passwordHash, details.schoolId],
      connection,
    )
    await rows(
      `INSERT INTO class_members (class_id,user_id,status,origin) VALUES (?,?,'pending','application')`,
      [details.id, insertId],
      connection,
    )
    return insertId
  })
}

async function selectSchool(schoolId) {
  const [item] = await rows('SELECT id, name, code FROM schools WHERE id=?', [asId(schoolId)])
  if (!item) fail(404, '学校不存在')
  return item
}

const auditReview = (connection, userId, actor, schoolId, classId, decision) =>
  rows(
    'INSERT INTO review_events (user_id,reviewer_id,school_id,class_id,decision) VALUES (?,?,?,?,?)',
    [userId, actor.id, schoolId, classId, decision],
    connection,
  )

function decisionOf(value) {
  if (!['approved', 'rejected'].includes(value)) fail(400, '请选择通过或驳回')
  return value
}

function rosterView(actor, classId, list, cipher) {
  return list.map(({ realNameCipher, ...row }) =>
    canSeeName(actor, classId) ? { ...row, realName: cipher.decrypt(realNameCipher) } : row,
  )
}

const ownSchool = (actor, schoolId) => {
  if (actor.school_status !== 'approved' || actor.school_id !== String(schoolId))
    fail(403, '请先通过该学校的入校审核')
}

async function createIdentity(connection, fields, cipher) {
  const password = temporaryPassword()
  const result = await rows(
    `INSERT INTO users (phone,nickname,real_name_cipher,password_hash,role,school_id,school_status)
     VALUES (?,?,?,?,?,?,?)`,
    [
      fields.phone,
      text(fields.nickname, '昵称', 80),
      cipher.encrypt(text(fields.realName, '实名', 80)),
      await hashPassword(password),
      fields.role,
      fields.schoolId || null,
      fields.schoolId ? 'approved' : 'none',
    ],
    connection,
  )
  return { userId: String(result.insertId), temporaryPassword: password, nickname: fields.nickname.trim() }
}

async function upsertForSchool(connection, item, schoolId, nextRole, cipher) {
  const phone = phoneNumber(item.phone)
  const [user] = await rows(
    'SELECT id, nickname, school_id, school_status, role FROM users WHERE phone=? FOR UPDATE',
    [phone],
    connection,
  )
  if (!user)
    return {
      phone,
      ...(await createIdentity(connection, { ...item, phone, schoolId, role: nextRole }, cipher)),
    }
  if (user.role === 'system_admin' && nextRole !== 'system_admin') fail(409, '该账号属于系统管理员')
  if (schoolId && user.school_status === 'approved' && user.school_id !== schoolId)
    fail(409, '该手机号已加入其他学校')
  if (schoolId) {
    const role = nextRole === 'school_admin' ? nextRole : user.role
    await rows(
      "UPDATE users SET school_id=?,school_status='approved',role=? WHERE id=?",
      [schoolId, role, user.id],
      connection,
    )
  } else if (nextRole === 'system_admin') {
    await rows("UPDATE users SET role='system_admin' WHERE id=?", [user.id], connection)
  }
  return { phone, userId: user.id, nickname: user.nickname }
}

const classListQuery = `SELECT c.id,c.name,c.cohort,c.school_id AS schoolId,c.major_id AS majorId,s.name AS school,m.name AS major
  FROM classes c JOIN schools s ON s.id=c.school_id JOIN majors m ON m.id=c.major_id`

export function enrollmentOptions() {
  return rows(`${classListQuery} ORDER BY s.name,m.name,c.cohort,c.name,c.id`)
}

export function enrollmentRoutes(cipher) {
  const router = Router()

  router.get('/schools', async (req, res) => {
    res.json(await rows('SELECT id,name,code FROM schools ORDER BY name'))
  })

  router.post('/my/school', async (req, res) => {
    const school = await selectSchool(req.body.schoolId)
    await transaction(async (connection) => {
      const user = await takeUser(connection, req.actor.id)
      if (user.school_status === 'approved') fail(409, '账号已经加入一个学校')
      if (user.school_status === 'pending') fail(409, '已有学校申请待审核')
      await rows(
        "UPDATE users SET school_id=?,school_status='pending' WHERE id=?",
        [school.id, user.id],
        connection,
      )
    })
    res.json(publicActor(await actorById(req.actor.id)))
  })

  router.get('/my/classes', async (req, res) => {
    ownSchool(req.actor, req.actor.school_id)
    res.json(
      await rows(`${classListQuery} WHERE c.school_id=? ORDER BY m.name,c.cohort,c.name`, [
        req.actor.school_id,
      ]),
    )
  })

  router.post('/my/classes', async (req, res) => {
    const details = req.body.schoolId
      ? await selectedPlacement(req.body)
      : await selectClass(req.body.classId)
    await transaction(async (connection) => {
      const user = await takeUser(connection, req.actor.id)
      if (['pending', 'approved'].includes(user.school_status)) {
        if (user.school_id !== details.schoolId) fail(409, '账号已选定其他学校')
      } else {
        await rows(
          "UPDATE users SET school_id=?,school_status='pending' WHERE id=?",
          [details.schoolId, user.id],
          connection,
        )
      }
      const [current] = await rows(
        'SELECT status FROM class_members WHERE class_id=? AND user_id=? FOR UPDATE',
        [details.id, user.id],
        connection,
      )
      if (current && current.status !== 'rejected')
        fail(409, current.status === 'approved' ? '你已加入该班级' : '该班申请正在审核')
      await rows(
        `INSERT INTO class_members (class_id,user_id,status,origin) VALUES (?,?,'pending','application')
        ON DUPLICATE KEY UPDATE status='pending',origin='application',requested_at=CURRENT_TIMESTAMP,reviewed_at=NULL`,
        [details.id, user.id],
        connection,
      )
    })
    res.json(publicActor(await actorById(req.actor.id)))
  })

  router.use('/admin', (req, res, next) => {
    if (!isAdmin(req.actor)) fail(403, '当前账号没有管理权限')
    next()
  })

  router.get('/admin/structure', async (req, res) => {
    const actor = req.actor
    const schoolScope = !isSystem(actor)
    const schoolIds = schoolScope ? [actor.school_id] : []
    const filter = schoolScope ? ' WHERE school_id=?' : ''
    const [schools, majors, classes] = await Promise.all([
      rows(`SELECT id,name,code FROM schools${schoolScope ? ' WHERE id=?' : ''} ORDER BY name`, schoolIds),
      rows(`SELECT id,school_id AS schoolId,name FROM majors${filter} ORDER BY name`, schoolIds),
      rows(
        `${classListQuery}${schoolScope ? ' WHERE c.school_id=?' : ''} ORDER BY s.name,m.name,c.cohort,c.name`,
        schoolIds,
      ),
    ])
    res.json({ schools, majors, classes: classes.filter((item) => classAccess(actor, item)) })
  })

  router.post('/admin/schools', async (req, res) => {
    if (!isSystem(req.actor)) fail(403, '站点由系统管理员创建')
    await rows('INSERT INTO schools (name,code) VALUES (?,?)', [
      text(req.body.name, '学校名称', 120),
      text(req.body.code, '学校编号', 40),
    ])
    res.status(201).json({ ok: true })
  })

  router.post('/admin/majors', async (req, res) => {
    const school = await selectSchool(req.body.schoolId)
    if (!isSystem(req.actor) && !isSchool(req.actor, school.id)) fail(403, '不能管理该学校')
    await rows('INSERT INTO majors (school_id,name) VALUES (?,?)', [
      school.id,
      text(req.body.name, '专业名称', 120),
    ])
    res.status(201).json({ ok: true })
  })

  router.post('/admin/classes', async (req, res) => {
    const school = await selectSchool(req.body.schoolId)
    if (!isSystem(req.actor) && !isSchool(req.actor, school.id)) fail(403, '不能管理该学校')
    const [major] = await rows('SELECT id FROM majors WHERE id=? AND school_id=?', [
      asId(req.body.majorId),
      school.id,
    ])
    if (!major) fail(400, '请选择本校专业')
    await rows('INSERT INTO classes (school_id,major_id,cohort,name) VALUES (?,?,?,?)', [
      school.id,
      major.id,
      text(req.body.cohort, '届别', 40),
      text(req.body.name, '班级名称', 120),
    ])
    res.status(201).json({ ok: true })
  })

  router.get('/admin/school-applications', async (req, res) => {
    if (!isSchool(req.actor, req.actor.school_id)) fail(403, '入校申请由学校管理员审核')
    res.json(
      await rows(
        `SELECT id,phone,nickname FROM users WHERE school_id=? AND school_status='pending' ORDER BY id`,
        [req.actor.school_id],
      ),
    )
  })

  router.post('/admin/school-applications/:userId/review', async (req, res) => {
    const actor = req.actor
    if (!isSchool(actor, actor.school_id)) fail(403, '入校申请由学校管理员审核')
    const decision = decisionOf(req.body.decision)
    await transaction(async (connection) => {
      const user = await takeUser(connection, asId(req.params.userId))
      if (user.school_id !== actor.school_id) fail(404, '申请不存在')
      if (user.school_status !== 'pending') fail(409, '该申请已处理')
      await rows('UPDATE users SET school_status=? WHERE id=?', [decision, user.id], connection)
      if (decision === 'rejected') {
        await rows(
          `UPDATE class_members cm JOIN classes c ON c.id=cm.class_id
          SET cm.status='rejected',cm.reviewed_at=CURRENT_TIMESTAMP
          WHERE cm.user_id=? AND c.school_id=? AND cm.status='pending'`,
          [user.id, user.school_id],
          connection,
        )
      }
      await auditReview(connection, user.id, actor, user.school_id, null, decision)
    })
    res.json({ ok: true })
  })

  async function roster(req, res) {
    const details = await selectClass(req.params.classId)
    if (!classAccess(req.actor, details)) fail(403, '不能管理该班')
    const status = req.query.status || 'approved'
    if (!['approved', 'pending', 'rejected'].includes(status)) fail(400, '申请状态无效')
    const filter = req.query.newOnly === '1' ? " AND cm.origin='precreated'" : ''
    const list = await rows(
      `SELECT u.id,u.phone,u.nickname,u.real_name_cipher AS realNameCipher,cm.origin,cm.requested_at AS requestedAt
      FROM class_members cm JOIN users u ON u.id=cm.user_id
      WHERE cm.class_id=? AND cm.status=? AND u.school_id=? AND u.school_status='approved'${filter}
      ORDER BY cm.requested_at DESC,u.id`,
      [details.id, status, details.schoolId],
    )
    res.json({
      classInfo: details,
      canSeeRealName: canSeeName(req.actor, details.id),
      users: rosterView(req.actor, details.id, list, cipher),
    })
  }
  router.get('/admin/classes/:classId/roster', roster)

  router.post('/admin/classes/:classId/applications/:userId/review', async (req, res) => {
    const details = await selectClass(req.params.classId)
    if (!classAccess(req.actor, details)) fail(403, '不能审核该班')
    const decision = decisionOf(req.body.decision)
    const userId = asId(req.params.userId)
    await transaction(async (connection) => {
      const user = await takeUser(connection, userId)
      if (user.school_id !== details.schoolId || user.school_status !== 'approved')
        fail(409, '申请人尚未通过入校审核')
      const changed = await rows(
        `UPDATE class_members SET status=?,reviewed_at=CURRENT_TIMESTAMP
        WHERE class_id=? AND user_id=? AND status='pending'`,
        [decision, details.id, userId],
        connection,
      )
      if (!changed.affectedRows) fail(409, '该申请已处理')
      await auditReview(connection, userId, req.actor, details.schoolId, details.id, decision)
    })
    res.json({ ok: true })
  })

  router.post('/admin/administrators', async (req, res) => {
    const { role, schoolId, classId, ...identity } = req.body
    const actor = req.actor
    let school
    let details
    if (role === 'system_admin' || role === 'school_admin') {
      if (!isSystem(actor)) fail(403, '请使用系统管理员账号')
      if (role === 'school_admin') school = await selectSchool(schoolId)
    } else if (role === 'class_admin') {
      details = await selectClass(classId)
      if (!isSchool(actor, details.schoolId)) fail(403, '教师由学校管理员设置')
      school = { id: details.schoolId }
    } else fail(400, '请选择管理员类型')
    const result = await transaction(async (connection) => {
      const account = await upsertForSchool(
        connection,
        identity,
        school?.id || null,
        role === 'class_admin' ? 'student' : role,
        cipher,
      )
      if (details)
        await rows(
          'INSERT IGNORE INTO class_admins (class_id,user_id) VALUES (?,?)',
          [details.id, account.userId],
          connection,
        )
      return account
    })
    res.json(result)
  })

  router.post('/admin/classes/:classId/students', async (req, res) => {
    const details = await selectClass(req.params.classId)
    if (!classAccess(req.actor, details)) fail(403, '不能录入该班')
    if (!Array.isArray(req.body.students) || !req.body.students.length) fail(400, '请提供要录入的学生')
    const result = []
    for (const item of req.body.students) {
      try {
        const entry = await transaction(async (connection) => {
          const account = await upsertForSchool(connection, item, details.schoolId, 'student', cipher)
          await rows(
            `INSERT INTO class_members (class_id,user_id,status,origin,reviewed_at)
            VALUES (?,?,'approved','precreated',CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE
            origin=IF(status='approved',origin,'precreated'),status='approved',reviewed_at=CURRENT_TIMESTAMP`,
            [details.id, account.userId],
            connection,
          )
          await auditReview(
            connection,
            account.userId,
            req.actor,
            details.schoolId,
            details.id,
            'precreated',
          )
          return account
        })
        result.push({ ...entry, ok: true })
      } catch (error) {
        if (!error.httpStatus && error.code !== 'ER_DUP_ENTRY') throw error
        result.push({
          phone: typeof item?.phone === 'string' ? item.phone : '',
          ok: false,
          message: error.httpStatus ? error.message : '手机号已存在，请重试该行',
        })
      }
    }
    res.json(result)
  })
  return router
}
