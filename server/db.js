import mysql from 'mysql2/promise'

const dbName = process.env.DB_NAME || 'gamebaby'
if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(dbName)) throw new Error('数据库名称无效')

const credentials = {
  host: process.env.DB_HOST || '192.168.0.9',
  port: Number(process.env.DB_PORT || 4000),
  user: process.env.DB_USER || 'gamebaby_app',
  password: process.env.DB_PASSWORD || '',
  supportBigNumbers: true,
  bigNumberStrings: true,
  charset: 'utf8mb4',
  connectTimeout: 5000,
}
export const db = mysql.createPool({ ...credentials, database: dbName, connectionLimit: 8 })

export async function rows(sql, params = [], connection = db) {
  const [result] = await connection.query(sql, params)
  return result
}

export async function transaction(work) {
  const connection = await db.getConnection()
  try {
    await connection.query('BEGIN PESSIMISTIC')
    const output = await work(connection)
    await connection.commit()
    return output
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}
