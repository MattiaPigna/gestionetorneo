const STORAGE_KEY = 'tournament_architect_saves'

function getAll() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
  catch { return [] }
}

function persistAll(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export async function fetchTournaments() {
  return getAll().map(({ id, name, sport, created_at, updated_at }) =>
    ({ id, name, sport, created_at, updated_at })
  )
}

export async function loadTournament(id) {
  const row = getAll().find(r => r.id === id)
  if (!row) throw new Error('Torneo non trovato')
  return row
}

export async function saveTournament(id, name, sport, data) {
  const list = getAll()
  const now  = new Date().toISOString()
  if (id) {
    const idx = list.findIndex(r => r.id === id)
    if (idx === -1) throw new Error('Torneo non trovato')
    list[idx] = { ...list[idx], name, sport, data, updated_at: now }
    persistAll(list)
    return list[idx]
  } else {
    const row = { id: Date.now(), name, sport, data, created_at: now, updated_at: now }
    list.push(row)
    persistAll(list)
    return row
  }
}

export async function deleteTournament(id) {
  persistAll(getAll().filter(r => r.id !== id))
  return { ok: true }
}
