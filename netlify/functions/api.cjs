// Netlify Function — handles all /api/* routes
const { Pool } = require('pg')
const bcrypt   = require('bcryptjs')
const jwt      = require('jsonwebtoken')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
})

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      username      TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS tournaments (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      sport      TEXT DEFAULT '',
      data       JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)
}

exports.handler = async (event) => {
  // Parse route: strip everything up to and including /api
  const rawPath = event.path || ''
  const route   = rawPath.replace(/^(\/\.netlify\/functions)?\/api/, '') || '/'
  const method  = event.httpMethod

  const cors = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  }

  if (method === 'OPTIONS') return { statusCode: 204, headers: cors }

  const ok   = (data, status = 200) => ({ statusCode: status, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  const fail = (msg, status = 400) => ok({ error: msg }, status)

  let body = {}
  try { body = JSON.parse(event.body || '{}') } catch {}

  const getUser = () => {
    const auth = (event.headers.authorization || event.headers.Authorization || '')
    if (!auth.startsWith('Bearer ')) return null
    try { return jwt.verify(auth.slice(7), process.env.JWT_SECRET) }
    catch { return null }
  }

  try {
    await initDb()

    const parts      = route.split('/').filter(Boolean)
    const resource   = parts[0]  // 'login' | 'register' | 'tournaments'
    const resourceId = parts[1]  // e.g. '42' or undefined

    // ── POST /register ────────────────────────────────────────────────────────
    if (resource === 'register' && method === 'POST') {
      const { username, password } = body
      if (!username?.trim() || !password)   return fail('Username e password richiesti')
      if (username.trim().length < 3)        return fail('Username troppo corto (min 3 caratteri)')
      if (password.length < 6)               return fail('Password troppo corta (min 6 caratteri)')

      const { rows: ex } = await pool.query('SELECT id FROM users WHERE username = $1', [username.trim().toLowerCase()])
      if (ex.length) return fail('Username già in uso')

      const hash = await bcrypt.hash(password, 10)
      const { rows } = await pool.query(
        'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
        [username.trim().toLowerCase(), hash]
      )
      const token = jwt.sign({ userId: rows[0].id, username: rows[0].username }, process.env.JWT_SECRET, { expiresIn: '30d' })
      return ok({ token, username: rows[0].username })
    }

    // ── POST /login ───────────────────────────────────────────────────────────
    if (resource === 'login' && method === 'POST') {
      const { username, password } = body
      if (!username || !password) return fail('Username e password richiesti')

      const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username.trim().toLowerCase()])
      if (!rows.length) return fail('Credenziali non valide', 401)

      const valid = await bcrypt.compare(password, rows[0].password_hash)
      if (!valid) return fail('Credenziali non valide', 401)

      const token = jwt.sign({ userId: rows[0].id, username: rows[0].username }, process.env.JWT_SECRET, { expiresIn: '30d' })
      return ok({ token, username: rows[0].username })
    }

    // ── All following routes require auth ─────────────────────────────────────
    const user = getUser()
    if (!user) return fail('Non autorizzato', 401)

    // ── GET /tournaments ──────────────────────────────────────────────────────
    if (resource === 'tournaments' && !resourceId && method === 'GET') {
      const { rows } = await pool.query(
        'SELECT id, name, sport, created_at, updated_at FROM tournaments WHERE user_id = $1 ORDER BY updated_at DESC',
        [user.userId]
      )
      return ok(rows)
    }

    // ── POST /tournaments ─────────────────────────────────────────────────────
    if (resource === 'tournaments' && !resourceId && method === 'POST') {
      const { name, sport, data } = body
      if (!name || !data) return fail('name e data sono richiesti')
      const { rows } = await pool.query(
        'INSERT INTO tournaments (user_id, name, sport, data) VALUES ($1, $2, $3, $4) RETURNING *',
        [user.userId, name, sport || '', data]
      )
      return ok(rows[0], 201)
    }

    // ── GET /tournaments/:id ──────────────────────────────────────────────────
    if (resource === 'tournaments' && resourceId && method === 'GET') {
      const { rows } = await pool.query(
        'SELECT * FROM tournaments WHERE id = $1 AND user_id = $2',
        [resourceId, user.userId]
      )
      if (!rows.length) return fail('Torneo non trovato', 404)
      return ok(rows[0])
    }

    // ── PUT /tournaments/:id ──────────────────────────────────────────────────
    if (resource === 'tournaments' && resourceId && method === 'PUT') {
      const { name, sport, data } = body
      const { rows } = await pool.query(
        `UPDATE tournaments SET name=$1, sport=$2, data=$3, updated_at=NOW()
         WHERE id=$4 AND user_id=$5 RETURNING *`,
        [name, sport || '', data, resourceId, user.userId]
      )
      if (!rows.length) return fail('Torneo non trovato', 404)
      return ok(rows[0])
    }

    // ── DELETE /tournaments/:id ───────────────────────────────────────────────
    if (resource === 'tournaments' && resourceId && method === 'DELETE') {
      await pool.query('DELETE FROM tournaments WHERE id = $1 AND user_id = $2', [resourceId, user.userId])
      return ok({ ok: true })
    }

    return fail('Endpoint non trovato', 404)

  } catch (err) {
    console.error('[api]', err)
    return fail('Errore del server: ' + err.message, 500)
  }
}
