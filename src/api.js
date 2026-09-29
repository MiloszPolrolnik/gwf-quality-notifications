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
  remove: (id) => request(`/notifications/${id}`, { method: 'DELETE' }),
}
