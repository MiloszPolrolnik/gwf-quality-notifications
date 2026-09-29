// Thin client for the Express backend (proxied to :3001 by Vite in dev).

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
  list: ({ status, q } = {}) => {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
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
  remove: (id) => request(`/notifications/${id}`, { method: 'DELETE' }),
}
