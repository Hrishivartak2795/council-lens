const BASE = import.meta.env.VITE_API_BASE || ''

function userId() {
  try { return localStorage.getItem('cl_user_id') || '' } catch { return '' }
}

async function req(path, { method = 'GET', body, params } = {}) {
  let url = BASE + path
  if (params) {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== false) qs.set(k, v)
    })
    const s = qs.toString()
    if (s) url += '?' + s
  }
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-User-Id': userId() },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    let msg = `Request failed (${res.status})`
    try { const j = await res.json(); if (j.detail) msg = typeof j.detail === 'string' ? j.detail : msg } catch {}
    const err = new Error(msg); err.status = res.status; throw err
  }
  return res.json()
}

export const api = {
  meta: () => req('/api/meta'),
  resolutions: (params) => req('/api/resolutions', { params }),
  resolution: (n) => req(`/api/resolutions/${n}`),
  clauses: (params) => req('/api/clauses', { params }),
  trends: (params) => req('/api/trends', { params }),
  eras: () => req('/api/eras'),
  compare: (params) => req('/api/compare', { params }),
  createUser: (display_name) => req('/api/users', { method: 'POST', body: { display_name } }),
  bookmarks: () => req('/api/bookmarks'),
  addBookmark: (resolution_number, note = '') => req('/api/bookmarks', { method: 'POST', body: { resolution_number, note } }),
  editNote: (n, note) => req(`/api/bookmarks/${n}`, { method: 'PATCH', body: { note } }),
  removeBookmark: (n) => req(`/api/bookmarks/${n}`, { method: 'DELETE' }),
  feedback: (body) => req('/api/feedback', { method: 'POST', body }),
}
