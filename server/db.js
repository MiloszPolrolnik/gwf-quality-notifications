import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { plainText } from '../src/richText.js'

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
    -- draft -> completed -> submitted (sent to reviewers) -> changes_requested | signed
    status            TEXT NOT NULL CHECK (status IN ('draft', 'completed', 'submitted', 'changes_requested', 'signed')),
    author_id         INTEGER,
    submitted_at      TEXT,
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
`)

// Databases created before the review workflow have a narrower status CHECK: rebuild the table.
if (!db.prepare("SELECT sql FROM sqlite_master WHERE name = 'notifications'").get().sql.includes("'signed'")) {
  db.exec(`
    BEGIN;
    ALTER TABLE notifications RENAME TO notifications_old;
    CREATE TABLE notifications (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      status            TEXT NOT NULL CHECK (status IN ('draft', 'completed', 'submitted', 'changes_requested', 'signed')),
      author_id         INTEGER,
      submitted_at      TEXT,
      part_no           TEXT NOT NULL DEFAULT '',
      part_description  TEXT NOT NULL DEFAULT '',
      applicant         TEXT NOT NULL DEFAULT '',
      data              TEXT NOT NULL,
      created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      completed_at      TEXT
    );
    INSERT INTO notifications (id, status, part_no, part_description, applicant, data, created_at, updated_at, completed_at)
      SELECT id, status, part_no, part_description, applicant, data, created_at, updated_at, completed_at
        FROM notifications_old;
    DROP TABLE notifications_old;
    COMMIT;
  `)
}
db.exec(`
  CREATE TABLE IF NOT EXISTS hidden_for (
    notification_id  INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    user_id          INTEGER NOT NULL,
    PRIMARY KEY (notification_id, user_id)
  );
  CREATE INDEX IF NOT EXISTS idx_notifications_status_updated
    ON notifications (status, updated_at DESC);
  -- one row per reviewer the author sent the notification to
  CREATE TABLE IF NOT EXISTS approvals (
    notification_id  INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    user_id          INTEGER NOT NULL,
    signed_at        TEXT,
    signature        TEXT,
    PRIMARY KEY (notification_id, user_id)
  );
  -- sticky notes: field_key names the form section ("s1".."s7") the note refers to
  CREATE TABLE IF NOT EXISTS comments (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    notification_id  INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    user_id          INTEGER NOT NULL,
    field_key        TEXT NOT NULL,
    text             TEXT NOT NULL,
    resolved         INTEGER NOT NULL DEFAULT 0,
    created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
`)
db.exec('PRAGMA foreign_keys = ON')

function summary(data) {
  return {
    part_no: plainText(data.partNo),
    part_description: plainText(data.partDesc),
    applicant: plainText(data.applicant),
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
    submittedAt: row.submitted_at,
    authorId: row.author_id,
  }
  if (withData) out.data = JSON.parse(row.data)
  return out
}

// status: one status or an array of them; authorId: only that user's own notifications;
// reviewerId: only notifications sent to that user.
export function list({ status, q, reviewerId, authorId } = {}) {
  const where = []
  const params = []
  const statuses = [].concat(status ?? [])
  if (statuses.length) {
    where.push(`status IN (${statuses.map(() => '?').join(',')})`)
    params.push(...statuses)
  }
  if (authorId) {
    where.push('author_id = ?')
    params.push(authorId)
  }
  if (reviewerId) {
    where.push('id IN (SELECT notification_id FROM approvals WHERE user_id = ?)', 'id NOT IN (SELECT notification_id FROM hidden_for WHERE user_id = ?)')
    params.push(reviewerId, reviewerId)
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

export function create({ status, data }, authorId = null) {
  const s = summary(data)
  const completedAt = status === 'completed' ? new Date().toISOString() : null
  const res = db
    .prepare(
      `INSERT INTO notifications (status, part_no, part_description, applicant, data, completed_at, author_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(status, s.part_no, s.part_description, s.applicant, JSON.stringify(data), completedAt, authorId)
  return get(Number(res.lastInsertRowid))
}

export function update(id, { status, data }) {
  const existing = db.prepare('SELECT status, completed_at FROM notifications WHERE id = ?').get(id)
  if (!existing) return null
  // sent to reviewers or signed: the content is frozen
  if (existing.status === 'submitted' || existing.status === 'signed') return { locked: true }
  // autosave while fixing requested changes must not drop the "changes requested" state
  if (existing.status === 'changes_requested' && status === 'draft') status = 'changes_requested'
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
  const res = db.prepare("DELETE FROM notifications WHERE id = ?").run(id)
  return res.changes > 0
}

// A reviewer removes a notification from their own list only; the author and the other reviewers keep it.
export function hideFor(id, userId) {
  db.prepare("INSERT OR IGNORE INTO hidden_for (notification_id, user_id) VALUES (?, ?)").run(id, userId)
}

// --- users & sessions ---------------------------------------------------

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    email          TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name           TEXT NOT NULL,
    password_hash  TEXT NOT NULL,
    created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash  TEXT PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at  TEXT NOT NULL
  );
`)
// where the reviewer placed the signature on the document: page and position/size as fractions of the page
for (const col of ['sig_page', 'sig_x', 'sig_y', 'sig_w', 'sig_h']) {
  if (!db.prepare('PRAGMA table_info(approvals)').all().some((c) => c.name === col)) {
    db.exec(`ALTER TABLE approvals ADD COLUMN ${col} REAL`)
  }
}
for (const col of ['role', 'signature']) {
  if (!db.prepare('PRAGMA table_info(users)').all().some((c) => c.name === col)) {
    db.exec(`ALTER TABLE users ADD COLUMN ${col} TEXT`)
  }
}

// role = the column of section 8 the user signs in; signature = PNG/JPEG data URL.
export const ROLES = ['E', 'SCM', 'P', 'GF', 'QM', 'SALES']

const publicUser = (u) =>
  u ? { id: u.id, email: u.email, name: u.name, role: u.role ?? null, hasSignature: Boolean(u.signature) } : null

export function createUser({ email, name, passwordHash, role = null }) {
  try {
    const res = db
      .prepare('INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)')
      .run(email, name, passwordHash, role)
    return publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(Number(res.lastInsertRowid)))
  } catch (e) {
    if (/UNIQUE/i.test(String(e.message))) return null
    throw e
  }
}

// Includes password_hash: only for the login check, never send it to the client.
export function findUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) ?? null
}

export const toPublicUser = publicUser

export function createSession(tokenHash, userId, expiresAt) {
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(new Date().toISOString())
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(
    tokenHash,
    userId,
    expiresAt,
  )
}

export function findSessionUser(tokenHash) {
  const row = db
    .prepare(
      `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get(tokenHash, new Date().toISOString())
  return publicUser(row)
}

export function deleteSession(tokenHash) {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash)
}

export function listUsers() {
  return db.prepare('SELECT id, email, name, created_at FROM users ORDER BY id').all()
}

export function setPassword(email, passwordHash) {
  const user = findUserByEmail(email)
  if (!user) return false
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, user.id)
  // log the user out everywhere
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id)
  return true
}

export function deleteUser(email) {
  return db.prepare('DELETE FROM users WHERE email = ?').run(email).changes > 0
}

export function setProfile(userId, { role, signature }) {
  db.prepare('UPDATE users SET role = ?, signature = ? WHERE id = ?').run(role, signature, userId)
  return publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(userId))
}

export function getUser(userId) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(userId) ?? null
}

// People the author can send a notification to: everyone who picked a signing column.
export function listReviewers() {
  return db
    .prepare('SELECT id, name, role FROM users WHERE role IS NOT NULL ORDER BY name COLLATE NOCASE')
    .all()
}

// --- review workflow -----------------------------------------------------

export function getApprovals(notificationId) {
  return db
    .prepare(
      `SELECT a.user_id AS userId, u.name, u.email, u.role, a.signed_at AS signedAt, a.signature,
              a.sig_page AS sigPage, a.sig_x AS sigX, a.sig_y AS sigY, a.sig_w AS sigW, a.sig_h AS sigH
         FROM approvals a JOIN users u ON u.id = a.user_id
        WHERE a.notification_id = ? ORDER BY u.name COLLATE NOCASE`,
    )
    .all(notificationId)
}

export function getComments(notificationId) {
  return db
    .prepare(
      `SELECT c.id, c.user_id AS userId, u.name AS userName, c.field_key AS fieldKey, c.text,
              c.resolved, c.created_at AS createdAt
         FROM comments c JOIN users u ON u.id = c.user_id
        WHERE c.notification_id = ? ORDER BY c.id`,
    )
    .all(notificationId)
    .map((c) => ({ ...c, resolved: Boolean(c.resolved) }))
}

export const openCommentCount = (notificationId) =>
  db.prepare('SELECT COUNT(*) AS n FROM comments WHERE notification_id = ? AND resolved = 0').get(notificationId).n

function setStatus(id, status, extra = '') {
  db.prepare(
    `UPDATE notifications SET status = ?${extra}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
  ).run(status, id)
}

// Sends to the given reviewers; earlier signatures are void because the content may have changed.
export function submit(id, reviewerIds) {
  db.exec('BEGIN')
  try {
    db.prepare('DELETE FROM approvals WHERE notification_id = ?').run(id)
    db.prepare('DELETE FROM hidden_for WHERE notification_id = ?').run(id)
    const ins = db.prepare('INSERT INTO approvals (notification_id, user_id) VALUES (?, ?)')
    for (const uid of reviewerIds) ins.run(id, uid)
    setStatus(id, 'submitted', ", submitted_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')")
    db.exec('COMMIT')
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
  return get(id)
}

export function addComment(id, userId, fieldKey, text) {
  db.prepare('INSERT INTO comments (notification_id, user_id, field_key, text) VALUES (?, ?, ?, ?)').run(
    id,
    userId,
    fieldKey,
    text,
  )
  setStatus(id, 'changes_requested')
}

export function resolveComment(notificationId, commentId, resolved) {
  return (
    db
      .prepare('UPDATE comments SET resolved = ? WHERE id = ? AND notification_id = ?')
      .run(resolved ? 1 : 0, commentId, notificationId).changes > 0
  )
}

export function sign(id, userId, signature, { page = null, x = null, y = null, w = null, h = null } = {}) {
  db.prepare(
    "UPDATE approvals SET signed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), signature = ?, sig_page = ?, sig_x = ?, sig_y = ?, sig_w = ?, sig_h = ? WHERE notification_id = ? AND user_id = ?",
  ).run(signature, page, x, y, w, h, id, userId)
  // the notification counts as signed only once every reviewer it was sent to has signed
  if (allSigned(id)) setStatus(id, 'signed')
}

export function allSigned(id) {
  const rows = db.prepare('SELECT signed_at FROM approvals WHERE notification_id = ?').all(id)
  return rows.length > 0 && rows.every((r) => r.signed_at)
}

// Notifications created before accounts existed belong to the oldest account.
db.exec(`
  UPDATE notifications SET author_id = (SELECT MIN(id) FROM users)
   WHERE author_id IS NULL AND EXISTS (SELECT 1 FROM users)
`)

// Only the note's author may delete it.
export function deleteComment(notificationId, commentId, userId) {
  return (
    db
      .prepare('DELETE FROM comments WHERE id = ? AND notification_id = ? AND user_id = ?')
      .run(commentId, notificationId, userId).changes > 0
  )
}

export function reopenForSigning(id) {
  setStatus(id, 'submitted')
}
