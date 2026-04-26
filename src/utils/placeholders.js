// ─── Placeholder reference types ──────────────────────────────────────────
// { type: 'group_rank',    rank: N,      group: 'A' }
// { type: 'match_winner', matchLabel:   'SF1' }
// { type: 'match_loser',  matchLabel:   'SF1' }
// { type: 'tbd' }
// null → string is a real team name (not a placeholder)

const GROUP_RANK_RE  = /^(\d+)[°º]?\s*(?:(?:girone|gruppo|group)\s+)?([A-Z])$/i
const WINNER_RE      = /^(?:vin(?:cente|citore)?|win(?:ner)?)\.?\s+(.+)/i
const LOSER_RE       = /^(?:perd(?:ente)?|los(?:er)?)\.?\s+(.+)/i
const TBD_RE         = /^(?:tbd|\?|da\s*def\.?|da\s*determinare)$/i

export function parsePlaceholderRef(str) {
  if (!str) return { type: 'tbd' }
  const s = str.trim()
  if (!s) return { type: 'tbd' }

  const rk = s.match(GROUP_RANK_RE)
  if (rk) return { type: 'group_rank', rank: parseInt(rk[1]), group: rk[2].toUpperCase() }

  const wn = s.match(WINNER_RE)
  if (wn) return { type: 'match_winner', matchLabel: wn[1].trim().toUpperCase() }

  const ls = s.match(LOSER_RE)
  if (ls) return { type: 'match_loser', matchLabel: ls[1].trim().toUpperCase() }

  if (TBD_RE.test(s)) return { type: 'tbd' }

  return null  // real team name, not a placeholder
}

export function isValidPlaceholder(str) {
  return parsePlaceholderRef(str) !== null
}

export function placeholderLabel(ref) {
  if (!ref) return '?'
  if (ref.type === 'group_rank')   return `${ref.rank}° Girone ${ref.group}`
  if (ref.type === 'match_winner') return `Vin. ${ref.matchLabel}`
  if (ref.type === 'match_loser')  return `Perd. ${ref.matchLabel}`
  if (ref.type === 'tbd')          return 'Da definire'
  return '?'
}

// ─── Group standings ───────────────────────────────────────────────────────

export function computeGroupStandings(matches) {
  const standings = {}   // { groupName: { teamId: { w,d,l,gf,ga,pts } } }

  matches.forEach(m => {
    if (m.phase !== 'group') return
    if (!m.result || m.result.status !== 'played') return
    const s1 = parseInt(m.result.score1)
    const s2 = parseInt(m.result.score2)
    if (isNaN(s1) || isNaN(s2)) return
    const t1 = m.team1Id, t2 = m.team2Id
    if (!t1 || !t2) return

    const g = m.round
    if (!standings[g]) standings[g] = {}
    if (!standings[g][t1]) standings[g][t1] = { w:0,d:0,l:0,gf:0,ga:0,pts:0 }
    if (!standings[g][t2]) standings[g][t2] = { w:0,d:0,l:0,gf:0,ga:0,pts:0 }
    const st1 = standings[g][t1], st2 = standings[g][t2]
    st1.gf += s1; st1.ga += s2
    st2.gf += s2; st2.ga += s1
    if (s1 > s2)      { st1.w++; st1.pts += 3; st2.l++ }
    else if (s1 < s2) { st2.w++; st2.pts += 3; st1.l++ }
    else              { st1.d++; st1.pts += 1; st2.d++; st2.pts += 1 }
  })

  // Convert to ranked arrays (sorted: pts → gd → gf)
  const ranked = {}
  Object.entries(standings).forEach(([group, teams]) => {
    ranked[group] = Object.entries(teams)
      .sort(([,a],[,b]) => {
        if (b.pts !== a.pts) return b.pts - a.pts
        const gdA = a.gf - a.ga, gdB = b.gf - b.ga
        if (gdB !== gdA) return gdB - gdA
        return b.gf - a.gf
      })
      .map(([teamId, stats], idx) => ({ teamId, rank: idx + 1, ...stats }))
  })
  return ranked
}

// ─── Resolve a single ref → teamId or null ────────────────────────────────

function lookupGroup(standings, groupCode) {
  if (!groupCode) return null
  // Try "Girone A", "A", case-insensitive
  for (const key of Object.keys(standings)) {
    const k = key.toLowerCase()
    const g = groupCode.toLowerCase()
    if (k === g || k === `girone ${g}` || k === `group ${g}` || k === `gruppo ${g}`) {
      return standings[key]
    }
  }
  return null
}

function lookupMatchByLabel(matchMap, label) {
  const lbl = label.toUpperCase()
  // Exact
  for (const m of Object.values(matchMap)) {
    if (m.label && m.label.toUpperCase() === lbl) return m
  }
  // Prefix match: "SF" matches "SEM" etc.
  for (const m of Object.values(matchMap)) {
    if (!m.label) continue
    const ml = m.label.toUpperCase()
    if (ml.startsWith(lbl) || lbl.startsWith(ml.replace(/\d+$/, ''))) {
      // same numeric suffix
      const numLbl = lbl.replace(/\D/g, '')
      const numMl  = ml.replace(/\D/g, '')
      if (numLbl === numMl) return m
    }
  }
  return null
}

export function resolveRef(ref, groupStandings, matchMap) {
  if (!ref) return null
  if (ref.type === 'group_rank') {
    const group = lookupGroup(groupStandings, ref.group)
    if (!group) return null
    return group.find(e => e.rank === ref.rank)?.teamId || null
  }
  if (ref.type === 'match_winner') {
    const m = lookupMatchByLabel(matchMap, ref.matchLabel)
    return m?.result?.winnerId || null
  }
  if (ref.type === 'match_loser') {
    const m = lookupMatchByLabel(matchMap, ref.matchLabel)
    return m?.result?.loserId || null
  }
  return null
}

// ─── Full resolution pass (multi-iteration for cascades) ──────────────────

export function resolveAllMatches(matches) {
  const matchMap = Object.fromEntries(matches.map(m => [m.id, m]))

  let current = [...matches]
  for (let pass = 0; pass < 8; pass++) {
    const standings = computeGroupStandings(current)
    let changed = false

    current = current.map(m => {
      // group matches always have real team IDs
      if (m.phase === 'group') return m

      const r1 = m.team1Id ? null : resolveRef(m.ref1, standings, matchMap)
      const r2 = m.team2Id ? null : resolveRef(m.ref2, standings, matchMap)

      const newR1 = r1 ?? m.resolvedTeam1Id ?? null
      const newR2 = r2 ?? m.resolvedTeam2Id ?? null

      if (newR1 === m.resolvedTeam1Id && newR2 === m.resolvedTeam2Id) return m

      changed = true
      const updated = { ...m, resolvedTeam1Id: newR1, resolvedTeam2Id: newR2 }
      matchMap[m.id] = updated
      return updated
    })

    if (!changed) break
  }

  return current
}
