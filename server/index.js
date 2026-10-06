import express from 'express'
import * as db from './db.js'
import { authRoutes, loadUser, requireAuth } from './auth.js'
import { plainText } from '../src/richText.js'
import { sendMail, formLink } from './mail.js'

const app = express()
app.use(express.json({ limit: '25mb' }))
app.use(loadUser)
authRoutes(app)
app.use('/api/notifications', requireAuth)

// Fields that must be filled in before a notification can be marked completed.
// Drafts have no requirements.
const REQUIRED_FOR_COMPLETION = [
  'date',
  'partNo',
  'partDesc',
  'applicant',
  'department',
  'problem',
]

function parseBody(body) {
  const status = body?.status
  const data = body?.data
  if (status !== 'draft' && status !== 'completed') {
    return { error: "status must be 'draft' or 'completed'" }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { error: 'data must be an object' }
  }
  if (status === 'completed') {
    const missing = REQUIRED_FOR_COMPLETION.filter((k) => !plainText(data[k]).trim())
    if (missing.length) return { error: 'missing required fields', missing, code: 422 }
  }
  return { status, data }
}

const STATUSES = ['draft', 'completed', 'submitted', 'changes_requested', 'signed']

function parseId(req, res) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: 'invalid id' })
    return null
  }
  return id
}

app.get('/api/notifications', (req, res) => {
  const { status, q, mine } = req.query
  const statuses = typeof status === 'string' && status ? status.split(',') : []
  if (statuses.some((s) => !STATUSES.includes(s))) return res.status(400).json({ error: 'invalid status' })
  res.json(
    db.list({
      status: statuses,
      q: typeof q === 'string' ? q.trim() : undefined,
      // every list is per account: own notifications, or the ones sent to me for review
      reviewerId: mine === 'reviewer' ? req.user.id : undefined,
      authorId: mine === 'reviewer' ? undefined : req.user.id,
    }),
  )
})

app.get('/api/notifications/:id', (req, res) => {
  const id = parseId(req, res)
  if (id === null) return
  const row = db.get(id)
  // visible to the author and to the people it was sent to
  if (!row || (row.authorId !== req.user.id && !db.getApprovals(id).some((a) => a.userId === req.user.id))) {
    return res.status(404).json({ error: 'not found' })
  }
  res.json({ ...row, approvals: db.getApprovals(id), comments: db.getComments(id) })
})

app.post('/api/notifications', (req, res) => {
  const parsed = parseBody(req.body)
  if (parsed.error) return res.status(parsed.code || 400).json(parsed)
  res.status(201).json(db.create(parsed, req.user.id))
})

app.put('/api/notifications/:id', (req, res) => {
  const id = parseId(req, res)
  if (id === null) return
  const parsed = parseBody(req.body)
  if (parsed.error) return res.status(parsed.code || 400).json(parsed)
  const current = db.get(id)
  if (!current || current.authorId !== req.user.id) return res.status(404).json({ error: 'not found' })
  if (req.body.keepImages) {
    if (current && current.status !== 'draft' && current.status !== 'changes_requested') {
      return res.status(409).json({ error: 'only drafts can be autosaved' })
    }
    if (current) {
      parsed.data.images = current.data?.images ?? []
      parsed.data.fieldImages = current.data?.fieldImages ?? {}
    }
  }
  const row = db.update(id, parsed)
  if (!row) return res.status(404).json({ error: 'not found' })
  if (row.locked) return res.status(409).json({ error: 'sent for review: cannot be edited' })
  res.json(row)
})

// --- review workflow ---------------------------------------------------------

app.get('/api/reviewers', (_req, res) => res.json(db.listReviewers()))

app.put('/api/profile', (req, res) => {
  const role = req.body?.role || null
  if (role !== null && !db.ROLES.includes(role)) return res.status(400).json({ error: 'invalid role' })
  const sig = req.body?.signature
  if (sig != null && (typeof sig !== 'string' || !/^data:image\/(png|jpeg);base64,/.test(sig) || sig.length > 700_000)) {
    return res.status(400).json({ error: 'invalid signature image' })
  }
  // signature: undefined keeps the stored one, null removes it
  const current = db.getUser(req.user.id)
  res.json(db.setProfile(req.user.id, { role, signature: sig === undefined ? current.signature : sig }))
})

app.get('/api/profile/signature', (req, res) => res.json({ signature: db.getUser(req.user.id)?.signature ?? null }))

// Loads a notification for a workflow action; sends the error response itself.
function workflowTarget(req, res) {
  const id = parseId(req, res)
  if (id === null) return null
  const row = db.get(id)
  if (!row) {
    res.status(404).json({ error: 'not found' })
    return null
  }
  return row
}
const full = (id) => ({ ...db.get(id), approvals: db.getApprovals(id), comments: db.getComments(id) })
const label = (row) => `Quality Notification #${row.id}${row.partNo ? ` (${row.partNo})` : ''}`
const isReviewer = (id, userId) => db.getApprovals(id).some((a) => a.userId === userId)

// Author sends a completed (or corrected) notification to the chosen reviewers.
app.post('/api/notifications/:id/submit', (req, res) => {
  const row = workflowTarget(req, res)
  if (!row) return
  if (row.authorId !== req.user.id) return res.status(403).json({ error: 'only the author can send' })
  if (row.status !== 'completed' && row.status !== 'changes_requested') {
    return res.status(409).json({ error: 'only completed notifications can be sent' })
  }
  const ids = [...new Set(Array.isArray(req.body?.reviewerIds) ? req.body.reviewerIds.map(Number) : [])]
  const reviewers = db.listReviewers().filter((r) => ids.includes(r.id))
  if (!reviewers.length || reviewers.length !== ids.length) {
    return res.status(400).json({ error: 'choose at least one valid reviewer' })
  }
  if (row.status === 'changes_requested' && db.openCommentCount(row.id)) {
    return res.status(409).json({ error: 'resolve all notes first', code: 'open_comments' })
  }
  db.submit(row.id, ids)
  for (const r of reviewers) {
    const u = db.getUser(r.id)
    sendMail({
      to: u.email,
      subject: `${label(row)} – Prüfung und Unterschrift erbeten`,
      text: `Hallo ${u.name},\n\n${req.user.name} bittet Sie, ${label(row)} zu prüfen und zu unterschreiben oder Änderungen anzufordern.`,
      link: formLink(row.id),
    })
  }
  res.json(full(row.id))
})

// Reviewer leaves a sticky note on a section; this sends the notification back to the author.
app.post('/api/notifications/:id/comments', (req, res) => {
  const row = workflowTarget(req, res)
  if (!row) return
  if (row.status !== 'submitted' && row.status !== 'changes_requested') {
    return res.status(409).json({ error: 'notification is not under review' })
  }
  if (!isReviewer(row.id, req.user.id)) return res.status(403).json({ error: 'not a reviewer of this notification' })
  const text = String(req.body?.text ?? '').trim()
  const fieldKey = String(req.body?.fieldKey ?? '')
  if (!text || text.length > 2000 || !/^s[1-7]$/.test(fieldKey)) return res.status(400).json({ error: 'invalid note' })
  const wasSubmitted = row.status === 'submitted'
  db.addComment(row.id, req.user.id, fieldKey, text)
  const author = row.authorId && db.getUser(row.authorId)
  if (wasSubmitted && author) {
    sendMail({
      to: author.email,
      subject: `${label(row)} – Änderungen erbeten`,
      text: `Hallo ${author.name},\n\n${req.user.name} hat zu ${label(row)} Anmerkungen hinterlassen:\n\n"${text}"`,
      link: formLink(row.id),
    })
  }
  res.status(201).json(full(row.id))
})

// Author marks a note as handled (or reopens it).
app.patch('/api/notifications/:id/comments/:commentId', (req, res) => {
  const row = workflowTarget(req, res)
  if (!row) return
  if (row.authorId !== req.user.id) return res.status(403).json({ error: 'only the author can resolve notes' })
  if (!db.resolveComment(row.id, Number(req.params.commentId), Boolean(req.body?.resolved))) {
    return res.status(404).json({ error: 'note not found' })
  }
  res.json(full(row.id))
})

// Reviewer deletes their own note; with no open notes left the notification is ready for signing again.
app.delete('/api/notifications/:id/comments/:commentId', (req, res) => {
  const row = workflowTarget(req, res)
  if (!row) return
  if (row.status !== 'submitted' && row.status !== 'changes_requested') {
    return res.status(409).json({ error: 'notification is not under review' })
  }
  if (!db.deleteComment(row.id, Number(req.params.commentId), req.user.id)) {
    return res.status(404).json({ error: 'note not found' })
  }
  if (row.status === 'changes_requested' && !db.openCommentCount(row.id)) db.reopenForSigning(row.id)
  res.json(full(row.id))
})

// Reviewer signs with their stored signature image; the date is set by the server.
app.post('/api/notifications/:id/sign', (req, res) => {
  const row = workflowTarget(req, res)
  if (!row) return
  if (row.status !== 'submitted' && row.status !== 'signed') {
    return res.status(409).json({ error: 'notification is not ready for signing' })
  }
  if (!isReviewer(row.id, req.user.id)) return res.status(403).json({ error: 'not a reviewer of this notification' })
  if (db.openCommentCount(row.id)) return res.status(409).json({ error: 'open notes', code: 'open_comments' })
  const me = db.getUser(req.user.id)
  if (!me.role || !me.signature) return res.status(409).json({ error: 'set role and signature first', code: 'no_signature' })
  // where the reviewer put the signature: page + position/size as fractions of the page
  const num = (v, lo, hi) => (v != null && v !== '' && Number.isFinite(Number(v)) ? Math.min(hi, Math.max(lo, Number(v))) : null)
  const b = req.body ?? {}
  const place = { page: num(b.page, 1, 50), x: num(b.x, 0, 1), y: num(b.y, 0, 1), w: num(b.w, 0.02, 1), h: num(b.h, 0.01, 1) }
  if (Object.values(place).some((v) => v === null)) Object.assign(place, { page: null, x: null, y: null, w: null, h: null })
  db.sign(row.id, req.user.id, me.signature, place)
  // one mail, only when the last required person has signed: to the author and all signers
  if (row.status === 'submitted' && db.allSigned(row.id)) {
    const recipients = new Map()
    if (row.authorId) recipients.set(row.authorId, db.getUser(row.authorId))
    for (const a of db.getApprovals(row.id)) recipients.set(a.userId, db.getUser(a.userId))
    for (const u of recipients.values()) {
      if (!u) continue
      sendMail({
        to: u.email,
        subject: `${label(row)} – von allen unterschrieben`,
        text: `Hallo ${u.name},\n\n${label(row)} wurde von allen erforderlichen Personen unterschrieben.`,
        link: formLink(row.id),
      })
    }
  }
  res.json(full(row.id))
})

app.delete('/api/notifications/:id', (req, res) => {
  const id = parseId(req, res)
  if (id === null) return
  const target = db.get(id)
  if (target && target.authorId !== req.user.id && isReviewer(id, req.user.id)) {
    db.hideFor(id, req.user.id)
    return res.status(204).end()
  }
  if (!target || target.authorId !== req.user.id) return res.status(404).json({ error: 'not found' })
  if (!db.remove(id)) {
    return res.status(404).json({ error: 'not found' })
  }
  res.status(204).end()
})

const port = Number(process.env.PORT) || 3001
app.listen(port, () => console.log(`QN API listening on http://localhost:${port}`))
