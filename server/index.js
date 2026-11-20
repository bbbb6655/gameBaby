import express from 'express'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from 'redis'
import { DEMO_SMS_CODE } from '../src/registration.js'
import { db, rows } from './db.js'
import { accountRoutes, managedAccount } from './account-management.js'
import {
  actorById,
  enrollmentOptions,
  enrollmentRoutes,
  publicActor,
  registerStudent,
} from './enrollment.js'
import { fileRoutes } from './files.js'
import { DEFAULT_ADMIN_LOGIN, initializeDatabase } from './startup.js'
import { studyRoutes } from './study.js'
import {
  fail,
  hashPassword,
  matchPassword,
  phoneNumber,
  profileCipher,
  sessionMatchesPassword,
  sessionService,
  text,
  validPassword,
} from './security.js'

const cipher = profileCipher()
const redis = createClient({
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  socket: { connectTimeout: 5000 },
})
redis.on('error', () => console.error('Redis 连接异常'))
await Promise.all([initializeDatabase(cipher), redis.connect()])

const sessions = sessionService(redis)
const app = express()
app.disable('x-powered-by')
app.set('trust proxy', 'loopback')
app.use('/api', (req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff')
  res.set('Cache-Control', 'no-store')
  if (
    !['GET', 'HEAD'].includes(req.method) &&
    req.headers.origin &&
    req.headers.origin !== `${req.protocol}://${req.headers.host}`
  )
    fail(403, '请从当前页面提交请求')
  next()
})
app.use(express.json({ limit: '5mb' }))

app.get('/api/health', async (req, res) => {
  await rows('SELECT 1')
  if ((await redis.ping()) !== 'PONG') fail(503, 'Redis 不可用')
  res.json({ ok: true })
})

app.get('/api/enrollment-options', async (req, res) => res.json(await enrollmentOptions()))

app.post('/api/auth/sms-code', (req, res) => {
  phoneNumber(req.body?.phone)
  res.json({ code: DEMO_SMS_CODE })
})

app.post('/api/auth/register', async (req, res) => {
  const userId = await registerStudent(req.body, cipher)
  const actor = await actorById(userId)
  await sessions.start(req, res, actor.id, actor.password_hash)
  res.status(201).json(publicActor(actor))
})

app.post('/api/auth/login', async (req, res) => {
  const identifier = req.body?.phone
  const phone =
    typeof identifier === 'string' && identifier.trim() === DEFAULT_ADMIN_LOGIN
      ? DEFAULT_ADMIN_LOGIN
      : phoneNumber(identifier)
  const password = validPassword(req.body.password)
  const [user] = await rows('SELECT id,password_hash FROM users WHERE phone=?', [phone])
  if (!user || !(await matchPassword(password, user.password_hash))) fail(401, '账号或密码不正确')
  await sessions.start(req, res, user.id, user.password_hash)
  res.json(publicActor(await actorById(user.id)))
})

app.post('/api/auth/logout', async (req, res) => {
  await sessions.end(req, res)
  res.json({ ok: true })
})
async function verifiedActor(session) {
  const actor = session ? await actorById(session.id) : null
  return actor && sessionMatchesPassword(session, actor.password_hash) ? actor : null
}
async function sessionActor(req) {
  const session = await sessions.current(req)
  req.session = session
  if (!session?.ownerToken) return verifiedActor(session)
  const [actor, owner] = await Promise.all([
    verifiedActor(session),
    sessions.owner(session).then(verifiedActor),
  ])
  req.canRestoreAccount = Boolean(owner)
  if (!actor || !owner || !(await managedAccount(owner, actor.id))) return null
  return { ...actor, impersonating: true }
}
app.get('/api/session', async (req, res) => {
  const actor = await sessionActor(req)
  res.json(actor ? publicActor(actor) : req.canRestoreAccount ? { canRestoreAccount: true } : null)
})

app.post('/api/auth/restore-account', async (req, res) => {
  const session = await sessions.current(req)
  const owner = await verifiedActor(await sessions.owner(session))
  if (!owner) fail(401, '原账号会话已失效，请重新登录')
  await sessions.restore(req, res, session)
  console.info('账号切换结束', { operatorId: owner.id, accountId: session.id })
  res.json(publicActor(owner))
})

app.use('/api', async (req, res, next) => {
  req.actor = await sessionActor(req)
  if (!req.actor) fail(401, '请先登录')
  next()
})
app.post('/api/admin/accounts/:userId/impersonate', async (req, res) => {
  if (req.actor.impersonating) fail(409, '请先返回原账号')
  const managed = await managedAccount(req.actor, req.params.userId)
  if (!managed) fail(404, '账号不在管理范围内')
  const target = await actorById(managed.id)
  if (!target) fail(404, '账号不存在')
  await sessions.impersonate(req, res, target.id, target.password_hash)
  console.info('账号切换开始', { operatorId: req.actor.id, accountId: target.id })
  res.json(publicActor({ ...target, impersonating: true }))
})
app.patch('/api/my/profile', async (req, res) => {
  await rows('UPDATE users SET nickname=? WHERE id=?', [text(req.body.nickname, '昵称', 80), req.actor.id])
  const actor = await actorById(req.actor.id)
  res.json(publicActor({ ...actor, impersonating: req.actor.impersonating }))
})
app.patch('/api/my/password', async (req, res) => {
  const previous = req.actor.password_hash
  if (!(await matchPassword(req.body.currentPassword, previous))) fail(400, '当前密码不正确')
  const passwordHash = await hashPassword(req.body.newPassword)
  const updated = await rows('UPDATE users SET password_hash=? WHERE id=? AND password_hash=?', [
    passwordHash,
    req.actor.id,
    previous,
  ])
  if (!updated.affectedRows) fail(409, '密码已变化，请重新登录')
  await sessions.start(req, res, req.actor.id, passwordHash, req.session.ownerToken)
  res.json({ ok: true })
})
app.use('/api', accountRoutes, enrollmentRoutes(cipher), studyRoutes, await fileRoutes())
app.use('/api', (req, res) => res.status(404).json({ error: '接口不存在' }))

const publicPorts = (process.env.APP_PUBLIC_PORTS || '').split(',').filter(Boolean).map(Number)
if (publicPorts.length) {
  const dist = fileURLToPath(new URL('../dist/', import.meta.url))
  app.get('/', (req, res) =>
    res.sendFile(resolve(dist, req.socket.localPort === 82 ? 'desktop.html' : 'index.html')),
  )
  app.use(express.static(dist, { index: false, redirect: false }))
}

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error)
  if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: '该手机号或记录已存在' })
  const status = error.httpStatus || error.status
  if (status >= 400 && status < 500)
    return res.status(status).json({ error: error.httpStatus ? error.message : '请求内容无效' })
  console.error('请求失败', req.method, req.path, error.code || error.name)
  res.status(500).json({ error: '服务暂时无法处理该请求' })
})

const port = Number(process.env.APP_PORT || 3001)
const listeners = [
  app.listen(port, process.env.APP_HOST || '127.0.0.1', () => console.log(`GameBaby API ${port}`)),
]
for (const publicPort of publicPorts) {
  listeners.push(app.listen(publicPort, '0.0.0.0', () => console.log(`GameBaby Web ${publicPort}`)))
}
for (const signal of ['SIGTERM', 'SIGINT'])
  process.once(signal, () => {
    Promise.all(listeners.map((listener) => new Promise((done) => listener.close(done)))).then(async () => {
      await db.end()
      await redis.close()
    })
  })
