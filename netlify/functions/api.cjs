// Netlify Function — handles all /api/* routes
const { Pool } = require('pg')
const bcrypt   = require('bcryptjs')
const jwt      = require('jsonwebtoken')

const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL,
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
    CREATE TABLE IF NOT EXISTS formats (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      text       TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
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
    // ── POST /gemini-parse (no DB needed) ─────────────────────────────────────
    if (route === '/gemini-parse' && method === 'POST') {
      const apiKey = process.env.GEMINI_API_KEY
      if (!apiKey) return fail('GEMINI_API_KEY non configurata', 500)

      const { text, numTeams = 8 } = body
      if (!text?.trim()) return fail('text è richiesto')

      const systemPrompt = `Sei un assistente per la configurazione di tornei sportivi. L'utente descriverà in linguaggio naturale come vuole strutturare il torneo con ${numTeams} squadre.

Analizza il messaggio e restituisci SOLO un oggetto JSON valido (nessun testo aggiuntivo, nessun blocco markdown), con questa struttura:
{
  "type": "roundrobin|groups_knockout|groups|knockout|double_elimination|swiss",
  "numGroups": 2,
  "advancePerGroup": 2,
  "hasThirdPlace": false,
  "seeded": false,
  "swissRounds": 5,
  "explanation": "Breve spiegazione in italiano di cosa hai capito"
}

Tipi disponibili:
- roundrobin: tutti contro tutti in un unico girone
- groups_knockout: fase a gironi seguita da eliminazione diretta
- groups: solo gironi paralleli, nessuna fase finale
- knockout: eliminazione diretta singola (una sconfitta = fuori)
- double_elimination: doppia eliminazione, tabellone vincitori + perdenti (due sconfitte = eliminato)
- swiss: sistema svizzero, turni fissi, nessuna eliminazione, classifica a punti

Messaggio utente: "${text.replace(/"/g, '\\"')}"`

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
          }),
        }
      )
      if (!res.ok) {
        const err = await res.text()
        console.error('[gemini]', err)
        return fail('Errore Gemini: ' + res.status, 502)
      }

      const data = await res.json()
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const jsonStr = raw.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim()

      let parsed
      try { parsed = JSON.parse(jsonStr) } catch {
        return fail('Risposta Gemini non valida: ' + jsonStr, 502)
      }

      const validTypes = ['roundrobin', 'groups_knockout', 'groups', 'knockout', 'double_elimination', 'swiss']
      const format = {
        type:            validTypes.includes(parsed.type) ? parsed.type : 'groups_knockout',
        numGroups:       Math.min(8, Math.max(2, parseInt(parsed.numGroups) || 2)),
        advancePerGroup: Math.min(6, Math.max(1, parseInt(parsed.advancePerGroup) || 2)),
        hasThirdPlace:   Boolean(parsed.hasThirdPlace),
        seeded:          Boolean(parsed.seeded),
        swissRounds:     Math.min(12, Math.max(3, parseInt(parsed.swissRounds) || 5)),
      }

      return ok({ format, explanation: parsed.explanation || 'Formato generato.' })
    }

    if (!process.env.NETLIFY_DATABASE_URL && !process.env.DATABASE_URL) {
      return fail('DATABASE_URL non configurata — aggiungila nelle variabili d\'ambiente Netlify', 500)
    }
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

    // ── GET /formats ──────────────────────────────────────────────────────────
    if (resource === 'formats' && !resourceId && method === 'GET') {
      const { rows } = await pool.query(
        'SELECT * FROM formats WHERE user_id = $1 ORDER BY created_at DESC',
        [user.userId]
      )
      return ok(rows)
    }

    // ── POST /formats ─────────────────────────────────────────────────────────
    if (resource === 'formats' && !resourceId && method === 'POST') {
      const { name, text } = body
      if (!name || !text) return fail('name e text sono richiesti')
      const { rows } = await pool.query(
        'INSERT INTO formats (user_id, name, text) VALUES ($1, $2, $3) RETURNING *',
        [user.userId, name, text]
      )
      return ok(rows[0], 201)
    }

    // ── DELETE /formats/:id ───────────────────────────────────────────────────
    if (resource === 'formats' && resourceId && method === 'DELETE') {
      await pool.query('DELETE FROM formats WHERE id = $1 AND user_id = $2', [resourceId, user.userId])
      return ok({ ok: true })
    }

    return fail('Endpoint non trovato', 404)

  } catch (err) {
    console.error('[api]', err)
    return fail('Errore del server: ' + err.message, 500)
  }
}
