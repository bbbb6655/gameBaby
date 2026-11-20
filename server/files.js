import { Router } from 'express'
import multer from 'multer'
import { randomUUID } from 'node:crypto'
import { mkdir, open, unlink } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { rows, transaction } from './db.js'
import { isAdmin, isApprovedStudent } from './enrollment.js'
import { fail, text } from './security.js'

const canUse = (actor) => isAdmin(actor) || isApprovedStudent(actor)
const hasApprovedClass = (actor, id) =>
  actor.adminClasses.includes(id) ||
  actor.enrollments.some((item) => item.id === id && item.status === 'approved')
const canDownload = (actor, file) => {
  if (file.kind === 'avatar') return actor.id === file.owner_id
  if (file.school_id === null || actor.role === 'system_admin') return true
  if (file.school_id !== actor.school_id) return false
  return !file.class_id || actor.role === 'school_admin' || hasApprovedClass(actor, file.class_id)
}

async function avatarMime(path) {
  const file = await open(path, 'r')
  try {
    const header = Buffer.alloc(12)
    await file.read(header)
    if (header.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) return 'image/png'
    if (header.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'))) return 'image/jpeg'
    if (['GIF87a', 'GIF89a'].includes(header.subarray(0, 6).toString())) return 'image/gif'
    if (header.subarray(0, 4).toString() === 'RIFF' && header.subarray(8, 12).toString() === 'WEBP')
      return 'image/webp'
    fail(400, '请选择 PNG、JPEG、GIF 或 WebP 图片作为头像')
  } finally {
    await file.close()
  }
}

function fileName(value) {
  const name = basename(value.replaceAll('\\', '/')).replace(/[\u0000-\u001f\u007f]/g, '')
  if ([...name].some((character) => character.charCodeAt(0) > 255)) return name.slice(0, 240)
  const corrected = Buffer.from(name, 'latin1').toString('utf8')
  return (corrected.includes('\ufffd') ? name : corrected).slice(0, 240) || 'file'
}

export async function fileRoutes() {
  const root = resolve(process.env.UPLOAD_DIR || './var/uploads')
  await Promise.all(
    ['avatars', 'materials'].map((folder) => mkdir(resolve(root, folder), { recursive: true })),
  )
  const router = Router()

  function uploader(folder) {
    return multer({
      storage: multer.diskStorage({
        destination: resolve(root, folder),
        filename: (req, file, next) => next(null, randomUUID()),
      }),
      limits: { files: 1, fields: 1 },
    }).single('file')
  }

  function active(req, res, next) {
    if (!canUse(req.actor)) fail(403, '审核通过后才可使用文件功能')
    next()
  }

  router.post('/my/avatar', active, uploader('avatars'), async (req, res) => {
    if (!req.file) fail(400, '请选择头像文件')
    try {
      const contentType = await avatarMime(req.file.path)
      const id = req.file.filename
      await transaction(async (connection) => {
        await rows(
          `INSERT INTO files (id,owner_id,school_id,kind,object_path,original_name,content_type,byte_size)
          VALUES (?,?,?,'avatar',?,?,?,?)`,
          [
            id,
            req.actor.id,
            req.actor.school_id,
            `avatars/${id}`,
            fileName(req.file.originalname),
            contentType,
            req.file.size,
          ],
          connection,
        )
        await rows('UPDATE users SET avatar_id=? WHERE id=?', [id, req.actor.id], connection)
      })
      res.status(201).json({ id })
    } catch (error) {
      await unlink(req.file.path).catch(() => {})
      throw error
    }
  })

  router.get('/materials', active, async (req, res) => {
    const list = await rows(
      `SELECT id,owner_id,school_id,class_id,kind,original_name AS name,byte_size AS size,created_at AS uploadedAt
      FROM files WHERE kind='material' ${req.actor.role !== 'system_admin' ? 'AND (school_id IS NULL OR school_id=?)' : ''} ORDER BY created_at DESC`,
      req.actor.role === 'system_admin' ? [] : [req.actor.school_id],
    )
    res.json(
      list
        .filter((item) => canDownload(req.actor, item))
        .map(({ id, name, size, uploadedAt, class_id }) => ({
          id,
          name,
          size,
          uploadedAt,
          classId: class_id,
        })),
    )
  })

  router.post(
    '/materials',
    (req, res, next) => {
      if (!isAdmin(req.actor)) fail(403, '教材与资源由管理员上传')
      next()
    },
    uploader('materials'),
    async (req, res) => {
      if (!req.file) fail(400, '请选择教材或资源文件')
      try {
        const id = req.file.filename
        const actor = req.actor
        let schoolId = actor.role === 'system_admin' ? null : actor.school_id
        const classId = req.body.classId ? text(req.body.classId, '班级', 25) : null
        if (classId) {
          const [item] = await rows('SELECT school_id FROM classes WHERE id=?', [classId])
          if (!item) fail(404, '班级不存在')
          if (actor.role === 'system_admin') schoolId = item.school_id
          else if (
            item.school_id !== schoolId ||
            (actor.role !== 'school_admin' && !actor.adminClasses.includes(classId))
          )
            fail(403, '不能向该班上传资源')
        } else if (!['system_admin', 'school_admin'].includes(actor.role))
          fail(400, '请选择要发布资源的班级')
        await rows(
          `INSERT INTO files (id,owner_id,school_id,class_id,kind,object_path,original_name,content_type,byte_size)
        VALUES (?,?,?,?,'material',?,?,?,?)`,
          [
            id,
            actor.id,
            schoolId,
            classId,
            `materials/${id}`,
            fileName(req.file.originalname),
            'application/octet-stream',
            req.file.size,
          ],
        )
        res.status(201).json({ id })
      } catch (error) {
        await unlink(req.file.path).catch(() => {})
        throw error
      }
    },
  )

  router.get('/files/:id', active, async (req, res) => {
    const [file] = await rows('SELECT * FROM files WHERE id=?', [req.params.id])
    if (!file || !canDownload(req.actor, file)) fail(404, '文件不存在')
    res.set('Cache-Control', 'private, no-store')
    if (file.kind === 'material') res.attachment(file.original_name)
    res.set('Content-Type', file.content_type)
    res.sendFile(file.object_path, { root })
  })
  return router
}
