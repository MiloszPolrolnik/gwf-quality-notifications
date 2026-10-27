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

// Quality Tracking columns. Added one by one so existing rows and data stay untouched.
// imported = row came from the Excel overview (no author, no form data).
for (const [col, ddl] of [
  ['qn_no', 'TEXT'],
  ['qn_year', 'INTEGER'],
  ['psw_type', "TEXT NOT NULL DEFAULT ''"],
  ['supplier_no', "TEXT NOT NULL DEFAULT ''"],
  ['supplier_name', "TEXT NOT NULL DEFAULT ''"],
  ['reason', "TEXT NOT NULL DEFAULT ''"],
  ['measures', "TEXT NOT NULL DEFAULT ''"],
  ['release_until_or_qty', "TEXT NOT NULL DEFAULT ''"],
  ['responsible', "TEXT NOT NULL DEFAULT ''"],
  ['qn_status', "TEXT NOT NULL DEFAULT ''"],
  ['tracking_status', "TEXT NOT NULL DEFAULT ''"],
  ['imported', 'INTEGER NOT NULL DEFAULT 0'],
]) {
  if (!db.prepare('PRAGMA table_info(notifications)').all().some((c) => c.name === col)) {
    db.exec(`ALTER TABLE notifications ADD COLUMN ${col} ${ddl}`)
  }
}
db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_qn_no ON notifications (qn_no) WHERE qn_no IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_notifications_qn_year ON notifications (qn_year);
`)

const join = (parts, sep) =>
  parts
    .map((p) => plainText(p).trim())
    .filter(Boolean)
    .join(sep)

// Columns derived from the form: list views, search and the Quality Tracking table.
function summary(data) {
  return {
    part_no: plainText(data.partNo),
    part_description: plainText(data.partDesc),
    applicant: plainText(data.applicant),
    psw_type: data.pswType === 'Serie' || data.pswType === 'Projekt' ? data.pswType : '',
    supplier_name: plainText(data.supplier),
    reason: plainText(data.problem),
    measures: join([data.parts?.details, data.process?.details, data.corrective?.details], '\n'),
    release_until_or_qty: join([data.process?.until, data.process?.quantity], ' / '),
    responsible: plainText(data.applicant),
  }
}

// Next free QN number of a year, YY-NNN: continues the highest one, imported rows included.
function nextQnNo(year) {
  const yy = String(year % 100).padStart(2, '0')
  const row = db
    .prepare('SELECT MAX(CAST(SUBSTR(qn_no, 4) AS INTEGER)) AS n FROM notifications WHERE qn_no GLOB ?')
    .get(`${yy}-[0-9]*`)
  return `${yy}-${String((row.n ?? 0) + 1).padStart(3, '0')}`
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
    qnNo: row.qn_no,
    imported: Boolean(row.imported),
  }
  if (withData) out.data = JSON.parse(row.data)
  return out
}

// status: one status or an array of them; authorId: only that user's own notifications;
// reviewerId: only notifications sent to that user which they have not signed yet;
// historyOf: that user's own notifications plus the ones they reviewed and signed.
export function list({ status, q, reviewerId, authorId, historyOf } = {}) {
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
    where.push('id IN (SELECT notification_id FROM approvals WHERE user_id = ? AND signed_at IS NULL)', 'id NOT IN (SELECT notification_id FROM hidden_for WHERE user_id = ?)')
    params.push(reviewerId, reviewerId)
  }
  if (historyOf) {
    where.push(
      '(author_id = ? OR (id IN (SELECT notification_id FROM approvals WHERE user_id = ? AND signed_at IS NOT NULL) AND id NOT IN (SELECT notification_id FROM hidden_for WHERE user_id = ?)))',
    )
    params.push(historyOf, historyOf, historyOf)
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
  // the QN number is allocated with the first save and never changes afterwards
  const year = new Date().getFullYear()
  const res = db
    .prepare(
      `INSERT INTO notifications (status, part_no, part_description, applicant, data, completed_at, author_id,
                                  qn_no, qn_year, psw_type, supplier_name, reason, measures, release_until_or_qty, responsible)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      status, s.part_no, s.part_description, s.applicant, JSON.stringify(data), completedAt, authorId,
      nextQnNo(year), year, s.psw_type, s.supplier_name, s.reason, s.measures, s.release_until_or_qty, s.responsible,
    )
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
            completed_at = ?, psw_type = ?, supplier_name = ?, reason = ?, measures = ?,
            release_until_or_qty = ?, responsible = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ?`,
  ).run(
    status, s.part_no, s.part_description, s.applicant, JSON.stringify(data), completedAt,
    s.psw_type, s.supplier_name, s.reason, s.measures, s.release_until_or_qty, s.responsible, id,
  )
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
db.exec(`
  CREATE TABLE IF NOT EXISTS password_resets (
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

// One open reset link per user: a new request replaces the old one.
export function createPasswordReset(tokenHash, userId, expiresAt) {
  db.prepare('DELETE FROM password_resets WHERE user_id = ? OR expires_at < ?').run(userId, new Date().toISOString())
  db.prepare('INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(tokenHash, userId, expiresAt)
}

// Consumes the token: returns the user id once, null if unknown or expired.
export function consumePasswordReset(tokenHash) {
  const row = db.prepare('SELECT user_id, expires_at FROM password_resets WHERE token_hash = ?').get(tokenHash)
  if (!row) return null
  db.prepare('DELETE FROM password_resets WHERE token_hash = ?').run(tokenHash)
  return row.expires_at > new Date().toISOString() ? row.user_id : null
}

export function setPasswordById(userId, passwordHash) {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, userId)
  // log the user out everywhere
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId)
}

// Removes the account with everything it owns: its notifications (with their approvals and notes),
// its own notes and signatures on other people's notifications, and its sessions.
// Notifications that were waiting only on this person are re-evaluated afterwards.
export function deleteAccount(userId) {
  db.exec('BEGIN')
  try {
    db.prepare('DELETE FROM notifications WHERE author_id = ?').run(userId)
    const affected = db
      .prepare(
        `SELECT DISTINCT notification_id AS id FROM approvals WHERE user_id = ?
         UNION SELECT DISTINCT notification_id FROM comments WHERE user_id = ?`,
      )
      .all(userId, userId)
    db.prepare('DELETE FROM approvals WHERE user_id = ?').run(userId)
    db.prepare('DELETE FROM comments WHERE user_id = ?').run(userId)
    db.prepare('DELETE FROM hidden_for WHERE user_id = ?').run(userId)
    for (const { id } of affected) {
      const n = get(id)
      if (!n) continue
      if (n.status === 'changes_requested' && !openCommentCount(id)) setStatus(id, 'submitted')
      if ((n.status === 'submitted' || n.status === 'changes_requested') && allSigned(id) && !openCommentCount(id)) {
        setStatus(id, 'signed')
      }
    }
    db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(userId)
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId)
    db.prepare('DELETE FROM users WHERE id = ?').run(userId)
    db.exec('COMMIT')
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
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
    .prepare('SELECT id, name, email, role FROM users WHERE role IS NOT NULL ORDER BY name COLLATE NOCASE')
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

// Adds reviewers without touching existing signatures; a fully signed notification waits for the new ones.
export function addReviewers(id, reviewerIds) {
  const ins = db.prepare('INSERT OR IGNORE INTO approvals (notification_id, user_id) VALUES (?, ?)')
  for (const uid of reviewerIds) ins.run(id, uid)
  if (get(id).status === 'signed') setStatus(id, 'submitted')
}

export function addComment(id, userId, fieldKey, text) {
  db.prepare('INSERT INTO comments (notification_id, user_id, field_key, text) VALUES (?, ?, ?, ?)').run(
    id,
    userId,
    fieldKey,
    text,
  )
}

export function requestChanges(id) {
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
   WHERE author_id IS NULL AND imported = 0 AND EXISTS (SELECT 1 FROM users)
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

// --- Quality Tracking ------------------------------------------------------
// One table for the whole company: nothing here is filtered by user. A notification made in the app
// shows up only once everybody has signed it (status 'signed'); imported rows are 'signed' from the start.
//
// A cell shows the value from the notification (form data, or the imported Excel value) unless
// somebody changed it in the table: that change lives in tracking_values and wins until it is reset.
// Custom columns (tracking_columns) have no form counterpart; their values live in tracking_values too.

db.exec(`
  CREATE TABLE IF NOT EXISTS tracking_columns (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    name     TEXT NOT NULL,
    type     TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'date', 'list')),
    options  TEXT NOT NULL DEFAULT '[]'
  );
  CREATE TABLE IF NOT EXISTS tracking_values (
    notification_id  INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    field            TEXT NOT NULL,
    value            TEXT NOT NULL,
    user_id          INTEGER,
    updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    PRIMARY KEY (notification_id, field)
  );
`)

export const TRACKING_FIRST_YEAR = 2017
export const TRACKING_STATES = ['offen', 'freigegeben', 'abgeschlossen']
// the table fields that also exist in the form / the Excel: filled automatically, editable by hand
export const TRACKING_FIELDS = ['pswType', 'partNo', 'partDesc', 'supplierNo', 'supplierName', 'reason', 'measures', 'releaseUntilOrQty', 'responsible', 'status', 'tracking']

// Status is typed in by hand for notifications made in the app, so it starts empty
const stateOf = (r) => (r.imported ? r.qn_status : '')

// year -> rows of the table with edits applied
function loadYear(year) {
  const rows = db.prepare("SELECT * FROM notifications WHERE status = 'signed' AND qn_year = ?").all(year)
  const values = db
    .prepare(
      `SELECT v.notification_id AS id, v.field, v.value, v.updated_at AS at, u.name AS by
         FROM tracking_values v JOIN notifications n ON n.id = v.notification_id
         LEFT JOIN users u ON u.id = v.user_id WHERE n.qn_year = ?`,
    )
    .all(year)
  const byRow = new Map()
  for (const v of values) {
    if (!byRow.has(v.id)) byRow.set(v.id, [])
    byRow.get(v.id).push(v)
  }
  return rows
    .map((r) => {
      const state = stateOf(r)
      // For notifications made in the app only QN-Nr. and Artikelnummer come from the form;
      // everything else is typed in by hand (imported rows carry their Excel values).
      const own = Boolean(r.imported)
      const out = {
        id: r.id,
        qnNo: r.qn_no,
        authorId: r.author_id,
        pswType: own ? r.psw_type : '',
        partNo: r.part_no,
        partDesc: own ? r.part_description : '',
        supplierNo: own ? r.supplier_no : '',
        supplierName: own ? r.supplier_name : '',
        reason: own ? r.reason : '',
        measures: own ? r.measures : '',
        releaseUntilOrQty: own ? r.release_until_or_qty : '',
        responsible: own ? r.responsible : '',
        status: state,
        tracking: r.imported ? r.tracking_status : '',
        custom: {},
        edited: {},
        // saved notifications made in the app can be turned into a PDF; rows without form cannot
        hasPdf: !r.imported,
        imported: Boolean(r.imported),
      }
      for (const v of byRow.get(r.id) ?? []) {
        if (TRACKING_FIELDS.includes(v.field)) {
          out[v.field] = v.value
          out.edited[v.field] = { by: v.by, at: v.at }
        } else out.custom[v.field] = v.value
      }
      return out
    })
    .sort((a, b) => (parseInt(a.qnNo.slice(3), 10) || 0) - (parseInt(b.qnNo.slice(3), 10) || 0) || a.id - b.id)
}

export function trackingYears(lastYear) {
  const rows = db.prepare("SELECT id, imported, status, qn_status, qn_year FROM notifications WHERE status = 'signed' AND qn_year IS NOT NULL").all()
  const status = new Map(db.prepare("SELECT notification_id AS id, value FROM tracking_values WHERE field = 'status'").all().map((v) => [v.id, v.value]))
  const byYear = new Map()
  for (const r of rows) {
    const y = byYear.get(r.qn_year) ?? { total: 0, open: 0 }
    y.total++
    if ((status.get(r.id) ?? stateOf(r)) === 'offen') y.open++
    byYear.set(r.qn_year, y)
  }
  const out = []
  for (let year = lastYear; year >= TRACKING_FIRST_YEAR; year--) out.push({ year, total: byYear.get(year)?.total ?? 0, open: byYear.get(year)?.open ?? 0 })
  return out
}

export function trackingList(year, { status, supplier, responsible, search } = {}) {
  const needle = (search ?? '').toLowerCase()
  return loadYear(year).filter(
    (r) =>
      (!status || r.status === status) &&
      (!supplier || r.supplierName === supplier) &&
      (!responsible || r.responsible === responsible) &&
      (!needle ||
        [r.qnNo, ...TRACKING_FIELDS.map((f) => r[f]), ...Object.values(r.custom)].some((v) => String(v ?? '').toLowerCase().includes(needle))),
  )
}

export function trackingColumns() {
  return db
    .prepare('SELECT id, name, type, options FROM tracking_columns ORDER BY id')
    .all()
    .map((c) => ({ ...c, key: `c${c.id}`, options: JSON.parse(c.options) }))
}

export function addTrackingColumn({ name, type, options }) {
  const res = db.prepare('INSERT INTO tracking_columns (name, type, options) VALUES (?, ?, ?)').run(name, type, JSON.stringify(options))
  return trackingColumns().find((c) => c.id === Number(res.lastInsertRowid))
}

export function updateTrackingColumn(id, { name, options }) {
  const res = db.prepare('UPDATE tracking_columns SET name = ?, options = ? WHERE id = ?').run(name, JSON.stringify(options), id)
  return res.changes > 0 ? trackingColumns().find((c) => c.id === id) : null
}

export function deleteTrackingColumn(id) {
  db.exec('BEGIN')
  try {
    db.prepare('DELETE FROM tracking_values WHERE field = ?').run(`c${id}`)
    const ok = db.prepare('DELETE FROM tracking_columns WHERE id = ?').run(id).changes > 0
    db.exec('COMMIT')
    return ok
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
}

// value null = back to what the notification says (custom columns: empty the cell).
// -> false when the row does not exist; throws nothing for unknown fields: the caller validates them.
export function setTrackingValue(id, field, value, userId) {
  if (!db.prepare("SELECT 1 FROM notifications WHERE id = ? AND status = 'signed' AND qn_year IS NOT NULL").get(id)) return false
  if (value === null || (value === '' && !TRACKING_FIELDS.includes(field))) {
    db.prepare('DELETE FROM tracking_values WHERE notification_id = ? AND field = ?').run(id, field)
  } else {
    db.prepare(
      `INSERT INTO tracking_values (notification_id, field, value, user_id) VALUES (?, ?, ?, ?)
       ON CONFLICT (notification_id, field) DO UPDATE SET value = excluded.value, user_id = excluded.user_id,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
    ).run(id, field, value, userId)
  }
  return true
}

// Changes the QN number of a row (the year follows it) -> 'ok' | 'missing' | 'exists'
export function renameQn(id, qnNo) {
  if (!db.prepare("SELECT 1 FROM notifications WHERE id = ? AND status = 'signed' AND qn_year IS NOT NULL").get(id)) return 'missing'
  if (db.prepare('SELECT 1 FROM notifications WHERE qn_no = ? AND id != ?').get(qnNo, id)) return 'exists'
  db.prepare('UPDATE notifications SET qn_no = ?, qn_year = ? WHERE id = ?').run(qnNo, 2000 + Number(qnNo.slice(0, 2)), id)
  return 'ok'
}

export function trackingRow(year, id) {
  return loadYear(year).find((r) => r.id === id) ?? null
}

// A row without a form (the Excel is gone, so entries are also typed in here): gets the next QN number.
export function createTrackingRow(year) {
  const qnNo = nextQnNo(year)
  const res = db
    .prepare(`INSERT INTO notifications (status, author_id, part_no, part_description, data, qn_no, qn_year, imported) VALUES ('signed', NULL, '', '', '{}', ?, ?, 1)`)
    .run(qnNo, year)
  return Number(res.lastInsertRowid)
}

// Only rows without a form can be removed here; notifications made in the app are deleted by their author.
export function deleteTrackingRow(id) {
  return db.prepare('DELETE FROM notifications WHERE id = ? AND imported = 1').run(id).changes > 0
}

// Import of a row of the Excel overview; false when the QN number exists already.
export function importTracking(row) {
  if (db.prepare('SELECT 1 FROM notifications WHERE qn_no = ?').get(row.qnNo)) return false
  db.prepare(
    `INSERT INTO notifications (status, author_id, part_no, part_description, data, qn_no, qn_year, psw_type,
                                supplier_no, supplier_name, reason, measures, release_until_or_qty, responsible,
                                qn_status, tracking_status, imported)
     VALUES ('signed', NULL, ?, ?, '{}', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
  ).run(
    row.partNo, row.partDesc, row.qnNo, 2000 + Number(row.qnNo.slice(0, 2)), row.pswType, row.supplierNo,
    row.supplierName, row.reason, row.measures, row.releaseUntilOrQty, row.responsible, row.status, row.tracking,
  )
  return true
}

// --- Sonderfreigaben Tracking ------------------------------------------------
// Same idea as the Quality Notifications tracking, but there is no form behind these rows:
// the table itself is the record (imported from the Excel overviews, then typed in here).

db.exec(`
  CREATE TABLE IF NOT EXISTS sonderfreigaben (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    sfr_no                TEXT NOT NULL UNIQUE,
    year                  INTEGER NOT NULL,
    psw_type              TEXT NOT NULL DEFAULT '',
    part_no               TEXT NOT NULL DEFAULT '',
    part_desc             TEXT NOT NULL DEFAULT '',
    supplier_no           TEXT NOT NULL DEFAULT '',
    supplier_name         TEXT NOT NULL DEFAULT '',
    reason                TEXT NOT NULL DEFAULT '',
    measures              TEXT NOT NULL DEFAULT '',
    release_until_or_qty  TEXT NOT NULL DEFAULT '',
    responsible           TEXT NOT NULL DEFAULT '',
    doku                  TEXT NOT NULL DEFAULT '',
    status                TEXT NOT NULL DEFAULT '',
    tracking              TEXT NOT NULL DEFAULT '',
    updated_by            INTEGER,
    updated_at            TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_sonderfreigaben_year ON sonderfreigaben (year);
  CREATE TABLE IF NOT EXISTS sf_columns (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    name     TEXT NOT NULL,
    type     TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'date', 'list')),
    options  TEXT NOT NULL DEFAULT '[]'
  );
  CREATE TABLE IF NOT EXISTS sf_values (
    sf_id  INTEGER NOT NULL REFERENCES sonderfreigaben(id) ON DELETE CASCADE,
    field  TEXT NOT NULL,
    value  TEXT NOT NULL,
    PRIMARY KEY (sf_id, field)
  );
`)

// API field -> column
const SF_COLUMNS = {
  pswType: 'psw_type',
  partNo: 'part_no',
  partDesc: 'part_desc',
  supplierNo: 'supplier_no',
  supplierName: 'supplier_name',
  reason: 'reason',
  measures: 'measures',
  releaseUntilOrQty: 'release_until_or_qty',
  responsible: 'responsible',
  doku: 'doku',
  status: 'status',
  tracking: 'tracking',
}
export const SF_FIELDS = Object.keys(SF_COLUMNS)

// Tracking decides: offen / freigegeben / abgeschlossen (the Status column of the old sheets holds anything)
const sfState = (tracking) => {
  const v = tracking.trim().toLowerCase()
  return v === 'open' ? 'offen' : v
}

function sfRows(where = '', params = []) {
  const rows = db.prepare(`SELECT * FROM sonderfreigaben ${where}`).all(...params)
  const values = new Map()
  for (const v of db
    .prepare(`SELECT sf_id, field, value FROM sf_values WHERE sf_id IN (SELECT id FROM sonderfreigaben ${where})`)
    .all(...params)) {
    if (!values.has(v.sf_id)) values.set(v.sf_id, {})
    values.get(v.sf_id)[v.field] = v.value
  }
  return rows
    .map((r) => ({
      id: r.id,
      qnNo: r.sfr_no,
      ...Object.fromEntries(SF_FIELDS.map((f) => [f, r[SF_COLUMNS[f]]])),
      state: sfState(r.tracking),
      custom: values.get(r.id) ?? {},
      edited: {},
      hasPdf: false,
      imported: true,
    }))
    .sort((a, b) => (parseInt(a.qnNo.split('-').pop(), 10) || 0) - (parseInt(b.qnNo.split('-').pop(), 10) || 0) || a.id - b.id)
}

export function sfYears(lastYear) {
  const byYear = new Map()
  for (const r of db.prepare('SELECT year, tracking FROM sonderfreigaben').all()) {
    const y = byYear.get(r.year) ?? { total: 0, open: 0 }
    y.total++
    if (sfState(r.tracking) === 'offen') y.open++
    byYear.set(r.year, y)
  }
  const out = []
  for (let year = lastYear; year >= TRACKING_FIRST_YEAR; year--) out.push({ year, total: byYear.get(year)?.total ?? 0, open: byYear.get(year)?.open ?? 0 })
  return out
}

export function sfList(year, { status, supplier, responsible, search } = {}) {
  const needle = (search ?? '').toLowerCase()
  return sfRows('WHERE year = ?', [year]).filter(
    (r) =>
      (!status || r.state === status) &&
      (!supplier || r.supplierName === supplier) &&
      (!responsible || r.responsible === responsible) &&
      (!needle || [r.qnNo, ...SF_FIELDS.map((f) => r[f]), ...Object.values(r.custom)].some((v) => String(v ?? '').toLowerCase().includes(needle))),
  )
}

export function sfRow(id) {
  return sfRows('WHERE id = ?', [id])[0] ?? null
}

export const sfColumns = () =>
  db
    .prepare('SELECT id, name, type, options FROM sf_columns ORDER BY id')
    .all()
    .map((c) => ({ ...c, key: `c${c.id}`, options: JSON.parse(c.options) }))

export function addSfColumn({ name, type, options }) {
  const res = db.prepare('INSERT INTO sf_columns (name, type, options) VALUES (?, ?, ?)').run(name, type, JSON.stringify(options))
  return sfColumns().find((c) => c.id === Number(res.lastInsertRowid))
}

export function updateSfColumn(id, { name, options }) {
  const res = db.prepare('UPDATE sf_columns SET name = ?, options = ? WHERE id = ?').run(name, JSON.stringify(options), id)
  return res.changes > 0 ? sfColumns().find((c) => c.id === id) : null
}

export function deleteSfColumn(id) {
  db.exec('BEGIN')
  try {
    db.prepare('DELETE FROM sf_values WHERE field = ?').run(`c${id}`)
    const ok = db.prepare('DELETE FROM sf_columns WHERE id = ?').run(id).changes > 0
    db.exec('COMMIT')
    return ok
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
}

// field: a column of the table, "qnNo" (the SFR number, the year follows it) or a custom column "c<id>".
// -> 'ok' | 'missing' | 'exists' ; null/'' empties a custom cell
export function setSfValue(id, field, value, userId) {
  if (!db.prepare('SELECT 1 FROM sonderfreigaben WHERE id = ?').get(id)) return 'missing'
  if (field === 'qnNo') {
    if (db.prepare('SELECT 1 FROM sonderfreigaben WHERE sfr_no = ? AND id != ?').get(value, id)) return 'exists'
    db.prepare('UPDATE sonderfreigaben SET sfr_no = ?, year = ? WHERE id = ?').run(value, 2000 + Number(value.match(/\d{2}/)[0]), id)
  } else if (SF_COLUMNS[field]) {
    db.prepare(`UPDATE sonderfreigaben SET ${SF_COLUMNS[field]} = ?, updated_by = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`).run(
      value ?? '',
      userId,
      id,
    )
  } else if (value === null || value === '') {
    db.prepare('DELETE FROM sf_values WHERE sf_id = ? AND field = ?').run(id, field)
  } else {
    db.prepare('INSERT INTO sf_values (sf_id, field, value) VALUES (?, ?, ?) ON CONFLICT (sf_id, field) DO UPDATE SET value = excluded.value').run(id, field, value)
  }
  return 'ok'
}

// Next free number of a year: SFR26-01, continuing the highest one
function nextSfrNo(year) {
  const yy = String(year % 100).padStart(2, '0')
  const row = db
    .prepare('SELECT MAX(CAST(SUBSTR(sfr_no, 7) AS INTEGER)) AS n FROM sonderfreigaben WHERE year = ? AND sfr_no GLOB ?')
    .get(year, `SFR${yy}-[0-9]*`)
  return `SFR${yy}-${String((row.n ?? 0) + 1).padStart(2, '0')}`
}

export function createSf(year) {
  return Number(db.prepare('INSERT INTO sonderfreigaben (sfr_no, year) VALUES (?, ?)').run(nextSfrNo(year), year).lastInsertRowid)
}

export function deleteSf(id) {
  return db.prepare('DELETE FROM sonderfreigaben WHERE id = ?').run(id).changes > 0
}

// Import of a row of an Excel overview; false when the number exists already.
export function importSonderfreigabe(row) {
  if (db.prepare('SELECT 1 FROM sonderfreigaben WHERE sfr_no = ?').get(row.qnNo)) return false
  db.prepare(
    `INSERT INTO sonderfreigaben (sfr_no, year, psw_type, part_no, part_desc, supplier_no, supplier_name, reason,
                                  measures, release_until_or_qty, responsible, doku, status, tracking)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    row.qnNo, 2000 + Number(row.qnNo.match(/\d{2}/)[0]), row.pswType, row.partNo, row.partDesc, row.supplierNo,
    row.supplierName, row.reason, row.measures, row.releaseUntilOrQty, row.responsible, row.doku, row.status, row.tracking,
  )
  return true
}
