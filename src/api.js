async function req(path, options = {}) {
  const token = localStorage.getItem('jwt')
  const res = await fetch(`/api${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  })
  if (res.status === 401) {
    window.dispatchEvent(new Event('auth:error'))
    throw Object.assign(new Error('Sessione scaduta'), { status: 401 })
  }
  const body = await res.json()
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
  return body
}

export const login    = (username, password) =>
  req('/login',    { method: 'POST', body: JSON.stringify({ username, password }) })

export const register = (username, password) =>
  req('/register', { method: 'POST', body: JSON.stringify({ username, password }) })

export const fetchTournaments = () => req('/tournaments')

export const loadTournament   = (id) => req(`/tournaments/${id}`)

export const saveTournament   = (id, name, sport, data) =>
  id
    ? req(`/tournaments/${id}`, { method: 'PUT',  body: JSON.stringify({ name, sport, data }) })
    : req('/tournaments',       { method: 'POST', body: JSON.stringify({ name, sport, data }) })

export const deleteTournament = (id) => req(`/tournaments/${id}`, { method: 'DELETE' })
