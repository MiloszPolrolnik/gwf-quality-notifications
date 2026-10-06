import crypto from 'node:crypto'
import { promisify } from 'node:util'
import * as db from './db.js'

const scrypt = promisify(crypto.scrypt)

const COOKIE = 'qn_session'
const SESSION_DAYS = 14
const MIN_PASSWORD = 8
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const key = await scrypt(password, salt, 64)
  return `${salt.toString('hex')}:${key.toString('hex')}`
}

async function verifyPassword(password, stored) {
  const [saltHex, keyHex] = stored.split(':')
  const expected = Buffer.from(keyHex, 'hex')
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length)
  return crypto.timingSafeEqual(actual, expected)
}

// Fixed hash so unknown e-mails cost the same time as wrong passwords.
const DUMMY_HASH = await hashPassword('dummy-password')

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex')

function readCookie(req, name) {
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=')
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim())
  }
  return null
}

function cookieAttrs(maxAgeSec) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure}`
}

function startSession(res, userId) {
  const token = crypto.randomBytes(32).toString('base64url')
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000)
  db.createSession(sha256(token), userId, expires.toISOString())
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; ${cookieAttrs(SESSION_DAYS * 86400)}`)
}

// Very small in-memory brute-force guard: 10 failed logins per 15 min per e-mail+IP.
const failures = new Map()
const WINDOW_MS = 15 * 60_000
const MAX_FAILURES = 10
function tooManyFailures(key) {
  const f = failures.get(key)
  return !!f && f.until > Date.now() && f.count >= MAX_FAILURES
}
function noteFailure(key) {
  const f = failures.get(key)
  if (!f || f.until <= Date.now()) failures.set(key, { count: 1, until: Date.now() + WINDOW_MS })
  else f.count++
}

export function loadUser(req, _res, next) {
  const token = readCookie(req, COOKIE)
  req.user = token ? db.findSessionUser(sha256(token)) : null
  next()
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'not authenticated' })
  next()
}

export function authRoutes(app) {
  app.post('/api/auth/register', async (req, res) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase()
    const name = String(req.body?.name ?? '').trim()
    const password = String(req.body?.password ?? '')
    if (!name) return res.status(400).json({ error: 'name required', field: 'name' })
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'invalid email', field: 'email' })
    if (password.length < MIN_PASSWORD) {
      return res.status(400).json({ error: 'password too short', field: 'password' })
    }
    const role = req.body?.role || null
    if (role !== null && !db.ROLES.includes(role)) return res.status(400).json({ error: 'invalid role', field: 'role' })
    const sig = req.body?.signature
    if (sig != null && (typeof sig !== 'string' || !/^data:image\/(png|jpeg);base64,/.test(sig) || sig.length > 700_000)) {
      return res.status(400).json({ error: 'invalid signature image', field: 'signature' })
    }
    let user = db.createUser({ email, name, passwordHash: await hashPassword(password), role })
    if (user && sig) user = db.setProfile(user.id, { role, signature: sig })
    if (!user) return res.status(409).json({ error: 'email already registered', field: 'email' })
    startSession(res, user.id)
    res.status(201).json(user)
  })

  app.post('/api/auth/login', async (req, res) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase()
    const password = String(req.body?.password ?? '')
    const key = `${email}|${req.ip}`
    if (tooManyFailures(key)) return res.status(429).json({ error: 'too many attempts' })
    const row = db.findUserByEmail(email)
    const ok = await verifyPassword(password, row?.password_hash ?? DUMMY_HASH)
    if (!row || !ok) {
      noteFailure(key)
      return res.status(401).json({ error: 'invalid credentials' })
    }
    failures.delete(key)
    startSession(res, row.id)
    res.json(db.toPublicUser(row))
  })

  app.post('/api/auth/logout', (req, res) => {
    const token = readCookie(req, COOKIE)
    if (token) db.deleteSession(sha256(token))
    res.setHeader('Set-Cookie', `${COOKIE}=; ${cookieAttrs(0)}`)
    res.status(204).end()
  })

  app.get('/api/auth/me', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'not authenticated' })
    res.json(req.user)
  })
}
