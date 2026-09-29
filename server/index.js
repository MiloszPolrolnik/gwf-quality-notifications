import express from 'express'
import * as db from './db.js'

const app = express()
app.use(express.json({ limit: '25mb' }))

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
    const missing = REQUIRED_FOR_COMPLETION.filter((k) => !String(data[k] ?? '').trim())
    if (missing.length) return { error: 'missing required fields', missing, code: 422 }
  }
  return { status, data }
}

function parseId(req, res) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: 'invalid id' })
    return null
  }
  return id
}

app.get('/api/notifications', (req, res) => {
  const { status, q } = req.query
  if (status && status !== 'draft' && status !== 'completed') {
    return res.status(400).json({ error: "status must be 'draft' or 'completed'" })
  }
  res.json(db.list({ status, q: typeof q === 'string' ? q.trim() : undefined }))
})

app.get('/api/notifications/:id', (req, res) => {
  const id = parseId(req, res)
  if (id === null) return
  const row = db.get(id)
  if (!row) return res.status(404).json({ error: 'not found' })
  res.json(row)
})

app.post('/api/notifications', (req, res) => {
  const parsed = parseBody(req.body)
  if (parsed.error) return res.status(parsed.code || 400).json(parsed)
  res.status(201).json(db.create(parsed))
})

app.put('/api/notifications/:id', (req, res) => {
  const id = parseId(req, res)
  if (id === null) return
  const parsed = parseBody(req.body)
  if (parsed.error) return res.status(parsed.code || 400).json(parsed)
  if (req.body.keepImages) {
    const current = db.get(id)
    if (current?.status === 'completed') return res.status(409).json({ error: 'completed notifications cannot be autosaved' })
    if (current) parsed.data.images = current.data?.images ?? []
  }
  const row = db.update(id, parsed)
  if (!row) return res.status(404).json({ error: 'not found' })
  res.json(row)
})

// Only drafts can be deleted; completed notifications stay in the history.
app.delete('/api/notifications/:id', (req, res) => {
  const id = parseId(req, res)
  if (id === null) return
  if (!db.remove(id)) {
    return res.status(404).json({ error: 'draft not found (completed notifications cannot be deleted)' })
  }
  res.status(204).end()
})

const port = Number(process.env.PORT) || 3001
app.listen(port, () => console.log(`QN API listening on http://localhost:${port}`))
