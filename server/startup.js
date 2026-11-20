import { readFile } from 'node:fs/promises'
import { rows } from './db.js'
import { hashPassword } from './security.js'

export const DEFAULT_ADMIN_LOGIN = 'admin'

export async function initializeDatabase(cipher) {
  const tables = new Set((await rows('SHOW TABLES')).map((row) => Object.values(row)[0]))
  const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8')
  for (const statement of schema
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)) {
    const table = /^CREATE TABLE IF NOT EXISTS (\w+)/i.exec(statement)?.[1]
    if (table && !tables.has(table)) await rows(statement)
  }

  if ((await rows('SELECT id FROM users LIMIT 1')).length) return
  await createDefaultAdmin(cipher, { onlyWhenEmpty: true })
}

export async function createDefaultAdmin(cipher, { onlyWhenEmpty = false } = {}) {
  const name = '系统管理员'
  const passwordHash = await hashPassword('123456')
  try {
    await rows(
      `INSERT INTO users (phone,nickname,real_name_cipher,password_hash,role)
       SELECT ?,?,?,?,'system_admin' FROM DUAL${onlyWhenEmpty ? ' WHERE NOT EXISTS (SELECT 1 FROM users)' : ''}`,
      [DEFAULT_ADMIN_LOGIN, name, cipher.encrypt(name), passwordHash],
    )
  } catch (error) {
    // 同时启动的实例可能先插入了同一个默认账号。
    if (!onlyWhenEmpty || error.code !== 'ER_DUP_ENTRY') throw error
  }
}
