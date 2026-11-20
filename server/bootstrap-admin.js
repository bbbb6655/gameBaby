import { readFile } from 'node:fs/promises'
import { db, rows } from './db.js'
import { hashPassword, phoneNumber, profileCipher, text } from './security.js'
import { DEFAULT_ADMIN_LOGIN, createDefaultAdmin } from './startup.js'

async function provisionNamedAdmin() {
  const [existing] = await rows('SELECT role FROM users WHERE phone=?', [DEFAULT_ADMIN_LOGIN])
  if (existing && existing.role !== 'system_admin') throw new Error('默认账号名已被占用')
  if (existing) {
    console.log('默认系统管理员已存在')
    return
  }
  await createDefaultAdmin(profileCipher())
  console.log('默认系统管理员已创建')
}

async function provisionPhoneAdmin() {
  const { phone, nickname, realName, password } = JSON.parse(await readFile(process.argv[2], 'utf8'))
  const [{ configured }] = await rows("SELECT COUNT(*) AS configured FROM users WHERE role='system_admin'")
  if (Number(configured)) throw new Error('已存在系统管理员，请通过后台添加账号')
  await rows(
    "INSERT INTO users (phone,nickname,real_name_cipher,password_hash,role) VALUES (?,?,?,?,'system_admin')",
    [
      phoneNumber(phone),
      text(nickname, '昵称', 80),
      profileCipher().encrypt(text(realName, '实名', 80)),
      await hashPassword(password),
    ],
  )
  console.log('系统管理员已创建')
}

try {
  if (process.argv[2] === '--default') await provisionNamedAdmin()
  else await provisionPhoneAdmin()
} catch (error) {
  console.error(error.code || error.message)
  process.exitCode = 1
} finally {
  await db.end()
}
