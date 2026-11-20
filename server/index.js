import express from 'express'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from 'redis'
import { db, rows } from './db.js'
import { actorById, enrollmentRoutes, publicActor } from './enrollment.js'
import { fileRoutes } from './files.js'
import { studyRoutes } from './study.js'
import {
  fail,
  hashPassword,
  matchPassword,
  phoneNumber,
  profileCipher,
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
await Promise.all([rows('SELECT 1'), redis.connect()])

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

app.post('/api/auth/register', async (req, res) => {
  const phone = phoneNumber(req.body.phone)
  const nickname = text(req.body.nickname, '昵称', 80)
  const realName = text(req.body.realName, '实名', 80)
  const passwordHash = await hashPassword(req.body.password)
  const record = await rows(
    'INSERT INTO users (phone,nickname,real_name_cipher,password_hash) VALUES (?,?,?,?)',
    [phone, nickname, cipher.encrypt(realName), passwordHash],
  )
  await sessions.start(req, res, record.insertId)
  res.status(201).json(publicActor(await actorById(record.insertId)))
})

app.post('/api/auth/login', async (req, res) => {
  const phone = phoneNumber(req.body.phone)
  const password = validPassword(req.body.password)
  const [user] = await rows('SELECT id,password_hash FROM users WHERE phone=?', [phone])
  if (!user || !(await matchPassword(password, user.password_hash))) fail(401, '手机号或密码不正确')
  await sessions.start(req, res, user.id)
  res.json(publicActor(await actorById(user.id)))
})

app.post('/api/auth/logout', async (req, res) => {
  await sessions.end(req, res)
  res.json({ ok: true })
})
app.get('/api/session', async (req, res) => {
  const id = await sessions.current(req)
  res.json(id ? publicActor(await actorById(id)) : null)
})

app.use('/api', async (req, res, next) => {
  const id = await sessions.current(req)
  req.actor = id ? await actorById(id) : null
  if (!req.actor) fail(401, '请先登录')
  next()
})
app.patch('/api/my/profile', async (req, res) => {
  await rows('UPDATE users SET nickname=? WHERE id=?', [text(req.body.nickname, '昵称', 80), req.actor.id])
  res.json(publicActor(await actorById(req.actor.id)))
})
app.patch('/api/my/password', async (req, res) => {
  const [user] = await rows('SELECT password_hash FROM users WHERE id=?', [req.actor.id])
  if (!(await matchPassword(req.body.currentPassword, user.password_hash))) fail(400, '当前密码不正确')
  await rows('UPDATE users SET password_hash=? WHERE id=?', [
    await hashPassword(req.body.newPassword),
    req.actor.id,
  ])
  await sessions.start(req, res, req.actor.id)
  res.json({ ok: true })
})
app.use('/api', enrollmentRoutes(cipher), studyRoutes, await fileRoutes())
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
