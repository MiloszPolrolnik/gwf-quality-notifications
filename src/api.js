// Thin client for the Express backend (proxied to :3001 by Vite in dev).

let onUnauthorized = () => {}
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn
}

async function request(path, options) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (res.status === 204) return null
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(body.error || `HTTP ${res.status}`)
    err.status = res.status
    err.field = body.field
    err.code = body.code
    if (res.status === 401 && !path.startsWith('/auth/')) onUnauthorized()
    err.missing = body.missing // field keys that block completion (HTTP 422)
    throw err
  }
  return body
}

// Fire-and-forget saves for pagehide: keepalive lets them outlive the page.
function keepalive(path, method, body) {
  try {
    fetch(`/api${path}`, {
      method,
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {})
  } catch {
    /* fetch unavailable */
  }
}

export const api = {
  me: () => request('/auth/me'),
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (name, email, password, role, signature) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role: role || null, signature: signature || null }),
    }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  list: ({ status, q, mine } = {}) => {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (mine) params.set('mine', mine)
    if (q) params.set('q', q)
    return request(`/notifications?${params}`)
  },
  get: (id) => request(`/notifications/${id}`),
  create: (status, data) => request('/notifications', { method: 'POST', body: JSON.stringify({ status, data }) }),
  update: (id, status, data) =>
    request(`/notifications/${id}`, { method: 'PUT', body: JSON.stringify({ status, data }) }),
  // keepImages: the payload omits images, so the server keeps the stored ones.
  updateKeepalive: (id, data) => keepalive(`/notifications/${id}`, 'PUT', { status: 'draft', data, keepImages: true }),
  createKeepalive: (data) => keepalive('/notifications', 'POST', { status: 'draft', data }),
  // review workflow
  reviewers: () => request('/reviewers'),
  submit: (id, reviewerIds) => request(`/notifications/${id}/submit`, { method: 'POST', body: JSON.stringify({ reviewerIds }) }),
  addNote: (id, fieldKey, text) =>
    request(`/notifications/${id}/comments`, { method: 'POST', body: JSON.stringify({ fieldKey, text }) }),
  resolveNote: (id, noteId, resolved) =>
    request(`/notifications/${id}/comments/${noteId}`, { method: 'PATCH', body: JSON.stringify({ resolved }) }),
  deleteNote: (id, noteId) => request(`/notifications/${id}/comments/${noteId}`, { method: 'DELETE' }),
  sign: (id, place = {}) => request(`/notifications/${id}/sign`, { method: 'POST', body: JSON.stringify(place) }),
  // profile: role = signing column, signature = data URL (undefined keeps, null removes)
  saveProfile: (profile) => request('/profile', { method: 'PUT', body: JSON.stringify(profile) }),
  mySignature: () => request('/profile/signature'),
  remove: (id) => request(`/notifications/${id}`, { method: 'DELETE' }),
}
