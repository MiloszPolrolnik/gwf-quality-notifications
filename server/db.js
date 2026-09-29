import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// All persistence lives in this file, so a later move to PostgreSQL
// (as used in AmLogistico) only touches this module.

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = process.env.QN_DATA_DIR || path.join(__dirname, '..', 'data')
fs.mkdirSync(dataDir, { recursive: true })

const db = new DatabaseSync(path.join(dataDir, 'notifications.db'))
db.exec('PRAGMA journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS notifications (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    status            TEXT NOT NULL CHECK (status IN ('draft', 'completed')),
    -- denormalised copies of a few fields, only used for list views / search
    part_no           TEXT NOT NULL DEFAULT '',
    part_description  TEXT NOT NULL DEFAULT '',
    applicant         TEXT NOT NULL DEFAULT '',
    -- the full form content as JSON
    data              TEXT NOT NULL,
    created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    completed_at      TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_notifications_status_updated
    ON notifications (status, updated_at DESC);
`)

function summary(data) {
  return {
    part_no: String(data.partNo ?? ''),
    part_description: String(data.partDesc ?? ''),
    applicant: String(data.applicant ?? ''),
  }
}

function toApi(row, { withData = true } = {}) {
  if (!row) return null
  const out = {
    id: row.id,
    status: row.status,
    partNo: row.part_no,
    partDesc: row.part_description,
    applicant: row.applicant,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  }
  if (withData) out.data = JSON.parse(row.data)
  return out
}

export function list({ status, q } = {}) {
  const where = []
  const params = []
  if (status) {
    where.push('status = ?')
    params.push(status)
  }
  if (q) {
    where.push('(part_no LIKE ? OR part_description LIKE ? OR applicant LIKE ? OR CAST(id AS TEXT) = ?)')
    const like = `%${q}%`
    params.push(like, like, like, q)
  }
  const sql = `SELECT * FROM notifications ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY updated_at DESC`
  return db.prepare(sql).all(...params).map((r) => toApi(r, { withData: false }))
}

export function get(id) {
  return toApi(db.prepare('SELECT * FROM notifications WHERE id = ?').get(id))
}

export function create({ status, data }) {
  const s = summary(data)
  const completedAt = status === 'completed' ? new Date().toISOString() : null
  const res = db
    .prepare(
      `INSERT INTO notifications (status, part_no, part_description, applicant, data, completed_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(status, s.part_no, s.part_description, s.applicant, JSON.stringify(data), completedAt)
  return get(Number(res.lastInsertRowid))
}

export function update(id, { status, data }) {
  const existing = db.prepare('SELECT status, completed_at FROM notifications WHERE id = ?').get(id)
  if (!existing) return null
  const s = summary(data)
  // completed_at is set the first time a notification is completed and kept afterwards
  const completedAt =
    status === 'completed' ? existing.completed_at || new Date().toISOString() : null
  db.prepare(
    `UPDATE notifications
        SET status = ?, part_no = ?, part_description = ?, applicant = ?, data = ?,
            completed_at = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ?`,
  ).run(status, s.part_no, s.part_description, s.applicant, JSON.stringify(data), completedAt, id)
  return get(id)
}

export function remove(id) {
  const res = db.prepare("DELETE FROM notifications WHERE id = ? AND status = 'draft'").run(id)
  return res.changes > 0
}
