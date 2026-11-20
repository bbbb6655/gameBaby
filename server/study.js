import { Router } from 'express'
import { initialData, reduce } from '../src/model.js'
import { rows, transaction } from './db.js'
import { isApprovedStudent } from './enrollment.js'
import { fail } from './security.js'

const studentActions = new Set([
  'adopt',
  'adopt-reset',
  'scenario',
  'care',
  'age-up',
  'event-answer',
  'post',
  'like',
  'comment',
  'best',
  'submit',
  'read',
  'favorite',
  'note',
])

function personalState(actor, saved) {
  const state = saved
    ? typeof saved === 'string'
      ? JSON.parse(saved)
      : saved
    : { schools: { a: initialData().schools.a } }
  const school = state.schools.a
  if (!saved) {
    school.baby = null
    school.logs = []
    school.posts = school.posts.filter((post) => post.section === '老师指导')
  }
  school.name = actor.schoolName
  school.student = actor.nickname
  school.classes = actor.enrollments.filter((item) => item.status === 'approved').map((item) => item.name)
  return state
}

export const studyRoutes = Router()
studyRoutes.use('/my/study-state', (req, res, next) => {
  if (!isApprovedStudent(req.actor)) fail(403, '请通过学校和班级审核')
  next()
})
studyRoutes.get('/my/study-state', async (req, res) => {
  const [saved] = await rows('SELECT data FROM student_state WHERE user_id=?', [req.actor.id])
  res.json(personalState(req.actor, saved?.data))
})
studyRoutes.post('/my/study-state', async (req, res) => {
  if (!studentActions.has(req.body.type)) fail(400, '不支持该学习操作')
  const action = { ...req.body, school: 'a', teacher: false, author: req.actor.nickname }
  const data = await transaction(async (connection) => {
    await rows('SELECT id FROM users WHERE id=? FOR UPDATE', [req.actor.id], connection)
    const [saved] = await rows(
      'SELECT data FROM student_state WHERE user_id=? FOR UPDATE',
      [req.actor.id],
      connection,
    )
    let state
    try {
      state = reduce(personalState(req.actor, saved?.data), action)
    } catch {
      fail(400, '演示记录参数无效')
    }
    await rows(
      'INSERT INTO student_state (user_id,data) VALUES (?,?) ON DUPLICATE KEY UPDATE data=VALUES(data)',
      [req.actor.id, JSON.stringify(state)],
      connection,
    )
    return state
  })
  res.json(data)
})
