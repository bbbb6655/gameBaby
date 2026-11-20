import { createCipheriv, createDecipheriv, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const derive = promisify(scrypt)
const sessionAge = 7 * 24 * 60 * 60

export function fail(status, message) {
  const error = new Error(message)
  error.httpStatus = status
  throw error
}

export function text(value, label, max) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max)
    fail(400, `请填写有效的${label}`)
  return value.trim()
}

export function phoneNumber(value) {
  const phone = text(value, '手机号', 32).replace(/[\s-]+/g, '')
  if (!/^\+?\d{6,20}$/.test(phone)) fail(400, '请填写有效的手机号')
  return phone.replace(/^\+86(?=1\d{10}$)/, '')
}

export function validPassword(value) {
  if (typeof value !== 'string' || !value || value.length > 200) fail(400, '请填写密码')
  return value
}

export async function hashPassword(value) {
  const salt = randomBytes(16).toString('hex')
  const hash = await derive(validPassword(value), salt, 64)
  return `${salt}:${hash.toString('hex')}`
}

export async function matchPassword(value, stored) {
  const [salt, hash] = stored.split(':')
  const candidate = await derive(validPassword(value), salt, 64)
  return timingSafeEqual(candidate, Buffer.from(hash, 'hex'))
}

export function profileCipher() {
  const key = Buffer.from(process.env.PROFILE_KEY || '', 'hex')
  if (key.length !== 32) throw new Error('PROFILE_KEY 需要 32 字节的十六进制密钥')
  return {
    encrypt(value) {
      const iv = randomBytes(12)
      const cipher = createCipheriv('aes-256-gcm', key, iv)
      const body = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
      return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64')
    },
    decrypt(value) {
      const body = Buffer.from(value, 'base64')
      const cipher = createDecipheriv('aes-256-gcm', key, body.subarray(0, 12))
      cipher.setAuthTag(body.subarray(12, 28))
      return Buffer.concat([cipher.update(body.subarray(28)), cipher.final()]).toString('utf8')
    },
  }
}

const cookieName = 'gamebaby_session'
function cookieValue(req) {
  const value = req.headers.cookie
    ?.split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1)
  return /^[0-9a-f]{64}$/.test(value || '') ? value : null
}
const redisKey = (value) => `gamebaby:session:${value}`
const cookieOptions = (req) => ({ httpOnly: true, sameSite: 'lax', secure: req.secure, path: '/' })

export function sessionService(redis) {
  return {
    async current(req) {
      const token = cookieValue(req)
      return token ? await redis.get(redisKey(token)) : null
    },
    async start(req, res, id) {
      await this.end(req, res)
      const token = randomBytes(32).toString('hex')
      await redis.set(redisKey(token), String(id), { EX: sessionAge })
      res.cookie(cookieName, token, { ...cookieOptions(req), maxAge: sessionAge * 1000 })
    },
    async end(req, res) {
      const token = cookieValue(req)
      if (token) await redis.del(redisKey(token))
      res.clearCookie(cookieName, cookieOptions(req))
    },
  }
}

export const temporaryPassword = () => randomBytes(12).toString('base64url')
