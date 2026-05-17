import { useState } from 'react'
import { useTournament } from '../store/tournamentStore'
import { placeholderLabel } from '../utils/placeholders'
import { Check, Pencil, Trophy, RefreshCw, Star, ArrowUpDown, List } from 'lucide-react'

const CARD_W   = 200
const CARD_H   = 76
const GAP      = 14    // gap between match cards vertically
const UNIT     = (CARD_H + GAP) / 2    // = 45
const CONN_W   = 40    // horizontal connector width
const COL_GAP  = 20    // gap after connector to next column
const COL_STEP = CARD_W + CONN_W + COL_GAP

// ─── Math helpers ─────────────────────────────────────────────────────────────

function yCenter(roundIdx, matchIdx) {
  return UNIT * Math.pow(2, roundIdx) * (2 * matchIdx + 1)
}

// ─── Inline result editor (bracket version) ───────────────────────────────────

function BracketResultEditor({ match, onClose }) {
  const { state, dispatch } = useTournament()
  const [s1, setS1] = useState(match.result?.score1 ?? '')
  const [s2, setS2] = useState(match.result?.score2 ?? '')

  const t1 = state.teams.find(t => t.id === (match.team1Id || match.resolvedTeam1Id))
  const t2 = state.teams.find(t => t.id === (match.team2Id || match.resolvedTeam2Id))

  const save = () => {
    dispatch({ type: 'SET_RESULT', payload: { matchId: match.id, score1: s1, score2: s2 } })
    onClose()
  }
  const clear = () => {
    dispatch({ type: 'SET_RESULT', payload: { matchId: match.id, score1: '', score2: '' } })
    onClose()
  }

  return (
    <div className="space-y-2 p-1">
      <div className="text-[10px] text-gray-400 text-center uppercase tracking-wider">Risultato</div>
      <div className="flex items-center gap-1.5">
        <div className="flex-1 text-right">
          {t1 && <span className="text-xs text-white truncate block">{t1.name}</span>}
        </div>
        <input type="number" min="0"
          className="w-10 bg-gray-700 border border-blue-500 rounded text-white text-center text-sm py-0.5 focus:outline-none"
          value={s1} onChange={e => setS1(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          autoFocus
        />
        <span className="text-gray-500 font-bold text-xs">-</span>
        <input type="number" min="0"
          className="w-10 bg-gray-700 border border-blue-500 rounded text-white text-center text-sm py-0.5 focus:outline-none"
          value={s2} onChange={e => setS2(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
        />
        <div className="flex-1">
          {t2 && <span className="text-xs text-white truncate block">{t2.name}</span>}
        </div>
      </div>
      <div className="flex gap-1">
        <button onClick={clear} className="flex-1 text-[10px] py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-all">Cancella</button>
        <button onClick={save} className="flex-1 text-[10px] py-1 bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center justify-center gap-1 transition-all">
          <Check size={9} />Salva
        </button>
        <button onClick={onClose} className="px-2 text-[10px] bg-gray-700 text-gray-400 rounded hover:bg-gray-600 transition-all">✕</button>
      </div>
    </div>
  )
}

// ─── Single match card in bracket ─────────────────────────────────────────────

function BracketCard({ match, x, y }) {
  const { state } = useTournament()
  const [editing, setEditing] = useState(false)

  const t1 = state.teams.find(t => t.id === (match.team1Id || match.resolvedTeam1Id))
  const t2 = state.teams.find(t => t.id === (match.team2Id || match.resolvedTeam2Id))

  const res    = match.result
  const played = res?.status === 'played'
  const win1   = played && res.winnerId === (match.team1Id || match.resolvedTeam1Id)
  const win2   = played && res.winnerId === (match.team2Id || match.resolvedTeam2Id)
  const isDraw = played && !res.winnerId

  return (
    <foreignObject x={x} y={y} width={CARD_W} height={editing ? CARD_H + 48 : CARD_H}>
      <div
        xmlns="http://www.w3.org/1999/xhtml"
        className={`rounded-xl border overflow-hidden select-none transition-all ${
          played
            ? 'bg-gray-800 border-emerald-700/50'
            : 'bg-gray-800 border-gray-600 hover:border-blue-500/60'
        }`}
        style={{ width: CARD_W, fontFamily: 'inherit' }}
      >
        {editing ? (
          <BracketResultEditor match={match} onClose={() => setEditing(false)} />
        ) : (
          <>
            {/* Label bar */}
            <div className={`px-2 py-0.5 flex items-center justify-between ${
              played ? 'bg-emerald-900/30' : 'bg-gray-700/40'
            }`}>
              <span className="text-[9px] font-bold text-gray-400 uppercase">{match.label}</span>
              <span className="text-[9px] text-gray-500">{match.round}</span>
              <button
                onClick={() => setEditing(true)}
                className="text-gray-600 hover:text-blue-400 transition-all ml-1"
                title="Inserisci risultato"
              >
                {played ? <Check size={10} className="text-emerald-400" /> : <Pencil size={9} />}
              </button>
            </div>
            {/* Team 1 */}
            <BracketTeamRow
              team={t1} ref1={match.ref1} ph={match.placeholder1}
              score={res?.score1} isWinner={win1} isDraw={isDraw}
            />
            {/* Team 2 */}
            <BracketTeamRow
              team={t2} ref1={match.ref2} ph={match.placeholder2}
              score={res?.score2} isWinner={win2} isDraw={isDraw}
            />
          </>
        )}
      </div>
    </foreignObject>
  )
}

function BracketTeamRow({ team, ref1, ph, score, isWinner, isDraw }) {
  const name = team?.name
    || (ref1 ? placeholderLabel(ref1) : (ph || '?'))

  const isPending = !team && !ref1

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 border-t border-gray-700/50 ${
      isWinner ? 'bg-emerald-900/25' : isDraw ? 'bg-gray-700/10' : ''
    }`}>
      {team
        ? <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />
        : <span className={`w-2 h-2 rounded-full flex-shrink-0 border ${
            ref1?.type === 'group_rank'   ? 'border-amber-500/60 bg-amber-900/20'
          : ref1?.type === 'match_winner' ? 'border-emerald-500/60 bg-emerald-900/20'
          : ref1?.type === 'match_loser'  ? 'border-red-500/60 bg-red-900/20'
          : 'border-gray-600'
          }`} />
      }
      <span className={`flex-1 text-xs truncate ${
        isWinner   ? 'text-emerald-300 font-semibold'
        : isPending ? 'text-gray-600 italic'
        : team      ? 'text-white'
        : ref1?.type === 'group_rank'   ? 'text-amber-400/80 text-[10px]'
        : ref1?.type === 'match_winner' ? 'text-emerald-400/80 text-[10px]'
        : ref1?.type === 'match_loser'  ? 'text-red-400/80 text-[10px]'
        : 'text-gray-500 italic text-[10px]'
      }`}>
        {name}
      </span>
      {score !== undefined && score !== '' && (
        <span className={`font-bold text-sm flex-shrink-0 ${isWinner ? 'text-emerald-300' : 'text-gray-400'}`}>
          {score}
        </span>
      )}
      {isWinner && <Check size={9} className="text-emerald-400 flex-shrink-0" />}
    </div>
  )
}

// ─── Third-place match ────────────────────────────────────────────────────────

function ThirdPlaceCard({ match, totalHeight }) {
  const y = totalHeight + 20
  return (
    <>
      <text x={4} y={y + 8} fontSize={9} fill="#6B7280" fontFamily="inherit" textAnchor="start">3° Posto</text>
      <BracketCard match={match} x={0} y={y + 14} />
    </>
  )
}

// ─── Group standings sidebar ───────────────────────────────────────────────────

function GroupStandings({ matches, teams }) {
  const teamMap = Object.fromEntries(teams.map(t => [t.id, t]))
  const groups  = {}

  matches.forEach(m => {
    if (m.phase !== 'group') return
    if (!groups[m.round]) groups[m.round] = {}
    ;[m.team1Id, m.team2Id].forEach(tid => {
      if (tid && !groups[m.round][tid]) {
        groups[m.round][tid] = { w:0,d:0,l:0,gf:0,ga:0,pts:0 }
      }
    })
    if (!m.result || m.result.status !== 'played') return
    const s1 = parseInt(m.result.score1)
    const s2 = parseInt(m.result.score2)
    if (isNaN(s1) || isNaN(s2)) return
    const st1 = groups[m.round][m.team1Id]
    const st2 = groups[m.round][m.team2Id]
    if (!st1 || !st2) return
    st1.gf += s1; st1.ga += s2
    st2.gf += s2; st2.ga += s1
    if (s1 > s2)      { st1.w++; st1.pts += 3; st2.l++ }
    else if (s1 < s2) { st2.w++; st2.pts += 3; st1.l++ }
    else              { st1.d++; st1.pts++; st2.d++; st2.pts++ }
  })

  const entries = Object.entries(groups)
  if (entries.length === 0) return null

  return (
    <div className="space-y-4">
      {entries.map(([groupName, teamData]) => {
        const rows = Object.entries(teamData)
          .sort(([,a],[,b]) => b.pts - a.pts || (b.gf-b.ga) - (a.gf-a.ga) || b.gf - a.gf)
        return (
          <div key={groupName} className="bg-gray-800/60 border border-gray-700 rounded-xl overflow-hidden">
            <div className="px-3 py-1.5 bg-gray-700/50 text-xs font-bold text-gray-300">{groupName}</div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b border-gray-700">
                  <th className="text-left px-3 py-1">Squadra</th>
                  <th className="px-1 py-1">G</th>
                  <th className="px-1 py-1">V</th>
                  <th className="px-1 py-1">P</th>
                  <th className="px-1 py-1">S</th>
                  <th className="px-1 py-1">GF</th>
                  <th className="px-1 py-1">GS</th>
                  <th className="px-2 py-1 font-bold">Pt</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([tid, s], idx) => {
                  const team = teamMap[tid]
                  const played = s.w + s.d + s.l
                  return (
                    <tr key={tid} className={`border-b border-gray-700/50 ${idx === 0 ? 'bg-emerald-900/15' : ''}`}>
                      <td className="px-3 py-1 flex items-center gap-1.5">
                        <span className="text-gray-500 w-3 text-right">{idx+1}.</span>
                        {team && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />}
                        <span className="text-white truncate">{team?.name || tid}</span>
                      </td>
                      <td className="text-center px-1 py-1 text-gray-400">{played}</td>
                      <td className="text-center px-1 py-1 text-emerald-400">{s.w}</td>
                      <td className="text-center px-1 py-1 text-gray-400">{s.d}</td>
                      <td className="text-center px-1 py-1 text-red-400">{s.l}</td>
                      <td className="text-center px-1 py-1 text-gray-300">{s.gf}</td>
                      <td className="text-center px-1 py-1 text-gray-300">{s.ga}</td>
                      <td className="text-center px-2 py-1 font-bold text-white">{s.pts}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}

// ─── Combined standings (for double_roundrobin) ───────────────────────────────

function CombinedStandings({ matches, teams }) {
  const teamMap = Object.fromEntries(teams.map(t => [t.id, t]))
  const st = {}
  teams.forEach(t => { st[t.id] = { w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 } })

  matches.forEach(m => {
    if (m.phase !== 'group' || !m.result || m.result.status !== 'played') return
    if (!m.team1Id || !m.team2Id) return
    const s1 = parseInt(m.result.score1), s2 = parseInt(m.result.score2)
    if (isNaN(s1) || isNaN(s2)) return
    if (!st[m.team1Id]) st[m.team1Id] = { w:0,d:0,l:0,gf:0,ga:0,pts:0 }
    if (!st[m.team2Id]) st[m.team2Id] = { w:0,d:0,l:0,gf:0,ga:0,pts:0 }
    st[m.team1Id].gf += s1; st[m.team1Id].ga += s2
    st[m.team2Id].gf += s2; st[m.team2Id].ga += s1
    if (s1 > s2)      { st[m.team1Id].w++; st[m.team1Id].pts += 3; st[m.team2Id].l++ }
    else if (s1 < s2) { st[m.team2Id].w++; st[m.team2Id].pts += 3; st[m.team1Id].l++ }
    else              { st[m.team1Id].d++; st[m.team1Id].pts++; st[m.team2Id].d++; st[m.team2Id].pts++ }
  })

  const rows = Object.entries(st).sort(([,a],[,b]) => b.pts - a.pts || (b.gf-b.ga) - (a.gf-a.ga) || b.gf - a.gf)
  const andataCount = matches.filter(m => m.round === 'Andata' && m.result?.status === 'played').length
  const ritornoCount = matches.filter(m => m.round === 'Ritorno' && m.result?.status === 'played').length

  return (
    <div className="p-4 space-y-4 overflow-auto h-full">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400 mb-1">
        <ArrowUpDown size={12} /> Classifica Combinata
        <span className="ml-auto text-gray-500 font-normal normal-case">
          Andata {andataCount} · Ritorno {ritornoCount}
        </span>
      </div>
      <div className="bg-gray-800/60 border border-gray-700 rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 border-b border-gray-700">
              <th className="text-left px-3 py-1.5">#</th>
              <th className="text-left px-3 py-1.5">Squadra</th>
              <th className="px-2 py-1.5">V</th>
              <th className="px-2 py-1.5">P</th>
              <th className="px-2 py-1.5">S</th>
              <th className="px-2 py-1.5">GF</th>
              <th className="px-2 py-1.5">GS</th>
              <th className="px-2 py-1.5 text-white font-bold">Pt</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([tid, s], i) => {
              const team = teamMap[tid]
              return (
                <tr key={tid} className={`border-b border-gray-700/40 ${i === 0 ? 'bg-amber-900/10' : i === 1 ? 'bg-gray-700/10' : ''}`}>
                  <td className="px-3 py-1.5">
                    <span className={`font-bold text-sm ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-gray-300' : 'text-gray-500'}`}>{i + 1}</span>
                  </td>
                  <td className="px-3 py-1.5 flex items-center gap-1.5">
                    {team && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />}
                    <span className="text-white">{team?.name || tid}</span>
                  </td>
                  <td className="text-center px-2 py-1.5 text-emerald-400">{s.w}</td>
                  <td className="text-center px-2 py-1.5 text-gray-400">{s.d}</td>
                  <td className="text-center px-2 py-1.5 text-red-400">{s.l}</td>
                  <td className="text-center px-2 py-1.5 text-gray-300">{s.gf}</td>
                  <td className="text-center px-2 py-1.5 text-gray-300">{s.ga}</td>
                  <td className="text-center px-2 py-1.5 font-bold text-white">{s.pts}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Placement Finals view ────────────────────────────────────────────────────

function PlacementView({ matches, teams }) {
  const teamMap = Object.fromEntries(teams.map(t => [t.id, t]))
  const groupMatches = matches.filter(m => m.phase === 'group')
  const placementMatches = matches.filter(m => m.phase === 'placement')

  // Compute standings from round-robin phase
  const st = {}
  teams.forEach(t => { st[t.id] = { w:0,d:0,l:0,gf:0,ga:0,pts:0 } })
  groupMatches.forEach(m => {
    if (!m.result || m.result.status !== 'played') return
    if (!m.team1Id || !m.team2Id) return
    const s1 = parseInt(m.result.score1), s2 = parseInt(m.result.score2)
    if (isNaN(s1) || isNaN(s2)) return
    if (!st[m.team1Id]) st[m.team1Id] = { w:0,d:0,l:0,gf:0,ga:0,pts:0 }
    if (!st[m.team2Id]) st[m.team2Id] = { w:0,d:0,l:0,gf:0,ga:0,pts:0 }
    st[m.team1Id].gf += s1; st[m.team1Id].ga += s2
    st[m.team2Id].gf += s2; st[m.team2Id].ga += s1
    if (s1 > s2)      { st[m.team1Id].w++; st[m.team1Id].pts += 3; st[m.team2Id].l++ }
    else if (s1 < s2) { st[m.team2Id].w++; st[m.team2Id].pts += 3; st[m.team1Id].l++ }
    else              { st[m.team1Id].d++; st[m.team1Id].pts++; st[m.team2Id].d++; st[m.team2Id].pts++ }
  })
  const ranked = Object.entries(st).sort(([,a],[,b]) => b.pts - a.pts || (b.gf-b.ga) - (a.gf-a.ga) || b.gf - a.gf)

  const { dispatch } = useTournament()
  const [editing, setEditing] = useState(null)
  const [scores, setScores] = useState({})

  const saveResult = (matchId) => {
    const sc = scores[matchId] || {}
    dispatch({ type: 'SET_RESULT', payload: { matchId, score1: sc.s1 ?? '', score2: sc.s2 ?? '' } })
    setEditing(null)
  }

  return (
    <div className="p-4 space-y-5 overflow-auto h-full">
      {/* Standings */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3">
          <List size={12} /> Classifica Girone
        </div>
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-gray-700">
                <th className="text-left px-3 py-1.5">#</th>
                <th className="text-left px-3 py-1.5">Squadra</th>
                <th className="px-2 py-1.5">V</th><th className="px-2 py-1.5">P</th>
                <th className="px-2 py-1.5">S</th><th className="px-2 py-1.5 font-bold text-white">Pt</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map(([tid, s], i) => {
                const team = teamMap[tid]
                const pos = i + 1
                const posColor = pos === 1 ? 'text-amber-400' : pos === 2 ? 'text-gray-300' : pos === 3 ? 'text-orange-500' : 'text-gray-500'
                return (
                  <tr key={tid} className="border-b border-gray-700/40">
                    <td className="px-3 py-1.5"><span className={`font-bold ${posColor}`}>{pos}</span></td>
                    <td className="px-3 py-1.5 flex items-center gap-1.5">
                      {team && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />}
                      <span className="text-white">{team?.name || tid}</span>
                    </td>
                    <td className="text-center px-2 py-1.5 text-emerald-400">{s.w}</td>
                    <td className="text-center px-2 py-1.5 text-gray-400">{s.d}</td>
                    <td className="text-center px-2 py-1.5 text-red-400">{s.l}</td>
                    <td className="text-center px-2 py-1.5 font-bold text-white">{s.pts}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Placement matches */}
      {placementMatches.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-400 mb-3">
            <Trophy size={12} /> Finali di Piazzamento
          </div>
          <div className="space-y-2">
            {placementMatches.map(m => {
              const rankIdx1 = parseInt(m.placeholder1) - 1  // "1° Classifica" → idx 0
              const rankIdx2 = parseInt(m.placeholder2) - 1
              const t1 = m.team1Id ? teamMap[m.team1Id] : ranked[rankIdx1] ? teamMap[ranked[rankIdx1][0]] : null
              const t2 = m.team2Id ? teamMap[m.team2Id] : ranked[rankIdx2] ? teamMap[ranked[rankIdx2][0]] : null
              const played = m.result?.status === 'played'
              const isEditing = editing === m.id
              const sc = scores[m.id] || {}

              return (
                <div key={m.id} className={`rounded-xl border p-3 ${played ? 'border-emerald-700/40 bg-emerald-900/10' : 'border-gray-700 bg-gray-800/50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-400">{m.round}</span>
                    {!isEditing && (
                      <button onClick={() => setEditing(m.id)} className="text-gray-500 hover:text-blue-400 transition-all">
                        {played ? <Check size={12} className="text-emerald-400" /> : <Pencil size={11} />}
                      </button>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="flex-1 text-xs text-white text-right truncate">{t1?.name || m.placeholder1}</span>
                        <input type="number" min="0" className="w-10 bg-gray-700 border border-blue-500 rounded text-white text-center text-sm py-0.5 focus:outline-none"
                          value={sc.s1 ?? ''} onChange={e => setScores(prev => ({ ...prev, [m.id]: { ...prev[m.id], s1: e.target.value } }))} autoFocus />
                        <span className="text-gray-500 text-xs">-</span>
                        <input type="number" min="0" className="w-10 bg-gray-700 border border-blue-500 rounded text-white text-center text-sm py-0.5 focus:outline-none"
                          value={sc.s2 ?? ''} onChange={e => setScores(prev => ({ ...prev, [m.id]: { ...prev[m.id], s2: e.target.value } }))} />
                        <span className="flex-1 text-xs text-white truncate">{t2?.name || m.placeholder2}</span>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setEditing(null)} className="flex-1 text-[10px] py-1 bg-gray-700 text-gray-300 rounded">Annulla</button>
                        <button onClick={() => saveResult(m.id)} className="flex-1 text-[10px] py-1 bg-blue-500 text-white rounded flex items-center justify-center gap-1"><Check size={9} />Salva</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-sm">
                      <span className={`flex-1 truncate ${t1 ? 'text-white' : 'text-gray-500 italic text-xs'}`}>{t1?.name || m.placeholder1}</span>
                      {played ? (
                        <span className="px-3 font-bold text-emerald-300">{m.result.score1} – {m.result.score2}</span>
                      ) : (
                        <span className="px-3 text-gray-600 text-xs">vs</span>
                      )}
                      <span className={`flex-1 text-right truncate ${t2 ? 'text-white' : 'text-gray-500 italic text-xs'}`}>{t2?.name || m.placeholder2}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-[10px] text-gray-600 mt-2">
            Completa tutte le partite del girone per determinare i partecipanti alle finali.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Double Elimination view ──────────────────────────────────────────────────

function DEMatchRow({ match, teams }) {
  const { dispatch } = useTournament()
  const t1 = teams.find(t => t.id === match.team1Id)
  const t2 = teams.find(t => t.id === match.team2Id)
  const played = match.result?.status === 'played'

  return (
    <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${played ? 'border-emerald-700/40 bg-emerald-900/10' : 'border-gray-700 bg-gray-800/50'}`}>
      <span className="text-gray-500 w-8 flex-shrink-0 font-mono">{match.label}</span>
      <span className={t1 ? 'text-white' : 'text-gray-500 italic'}>{t1?.name || match.placeholder1 || '?'}</span>
      <span className="text-gray-600">vs</span>
      <span className={t2 ? 'text-white' : 'text-gray-500 italic'}>{t2?.name || match.placeholder2 || '?'}</span>
      {played && <span className="ml-auto text-emerald-400 font-bold">{match.result.score1} – {match.result.score2}</span>}
    </div>
  )
}

function DoubleEliminationView({ matches, teams }) {
  const wbMatches = matches.filter(m => m.phase === 'winners')
  const lbMatches = matches.filter(m => m.phase === 'losers')
  const gfMatches = matches.filter(m => m.round === 'Grande Finale')

  const wbByRound = {}
  wbMatches.forEach(m => { if (!wbByRound[m.round]) wbByRound[m.round] = []; wbByRound[m.round].push(m) })
  const lbByRound = {}
  lbMatches.forEach(m => { if (!lbByRound[m.round]) lbByRound[m.round] = []; lbByRound[m.round].push(m) })

  return (
    <div className="p-4 space-y-6 overflow-auto h-full">
      {/* Winner's Bracket */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400 mb-3">
          <RefreshCw size={12} /> Tabellone Vincitori (WB)
        </div>
        <div className="space-y-3">
          {Object.entries(wbByRound).map(([round, ms]) => (
            <div key={round}>
              <div className="text-[10px] text-gray-500 mb-1.5 font-medium">{round}</div>
              <div className="space-y-1">
                {ms.map(m => <DEMatchRow key={m.id} match={m} teams={teams} />)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Loser's Bracket */}
      {lbMatches.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-400 mb-3">
            <RefreshCw size={12} /> Tabellone Perdenti (LB)
          </div>
          <div className="space-y-3">
            {Object.entries(lbByRound).map(([round, ms]) => (
              <div key={round}>
                <div className="text-[10px] text-gray-500 mb-1.5 font-medium">{round}</div>
                <div className="space-y-1">
                  {ms.map(m => <DEMatchRow key={m.id} match={m} teams={teams} />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grand Final */}
      {gfMatches.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">
            <Trophy size={12} /> Grande Finale
          </div>
          <div className="space-y-1">
            {gfMatches.map(m => <DEMatchRow key={m.id} match={m} teams={teams} />)}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Swiss standings view ─────────────────────────────────────────────────────

function SwissView({ matches, teams }) {
  const teamMap = Object.fromEntries(teams.map(t => [t.id, t]))
  const standings = {}
  teams.forEach(t => { standings[t.id] = { w: 0, d: 0, l: 0, pts: 0, played: 0 } })

  matches.forEach(m => {
    if (!m.result || m.result.status !== 'played') return
    if (!m.team1Id || !m.team2Id) return
    const s1 = parseInt(m.result.score1), s2 = parseInt(m.result.score2)
    if (isNaN(s1) || isNaN(s2)) return
    if (!standings[m.team1Id]) standings[m.team1Id] = { w: 0, d: 0, l: 0, pts: 0, played: 0 }
    if (!standings[m.team2Id]) standings[m.team2Id] = { w: 0, d: 0, l: 0, pts: 0, played: 0 }
    standings[m.team1Id].played++; standings[m.team2Id].played++
    if (s1 > s2) { standings[m.team1Id].w++; standings[m.team1Id].pts += 3; standings[m.team2Id].l++ }
    else if (s2 > s1) { standings[m.team2Id].w++; standings[m.team2Id].pts += 3; standings[m.team1Id].l++ }
    else { standings[m.team1Id].d++; standings[m.team1Id].pts++; standings[m.team2Id].d++; standings[m.team2Id].pts++ }
  })

  const rows = Object.entries(standings).sort(([,a],[,b]) => b.pts - a.pts || b.w - a.w)

  const byRound = {}
  matches.forEach(m => { if (!byRound[m.round]) byRound[m.round] = []; byRound[m.round].push(m) })

  return (
    <div className="p-4 space-y-5 overflow-auto h-full">
      <div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-400 mb-3">
          <Star size={12} /> Classifica Svizzero
        </div>
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-gray-700">
                <th className="text-left px-3 py-1.5">#</th>
                <th className="text-left px-3 py-1.5">Squadra</th>
                <th className="px-2 py-1.5">G</th>
                <th className="px-2 py-1.5 text-emerald-400">V</th>
                <th className="px-2 py-1.5">P</th>
                <th className="px-2 py-1.5 text-red-400">S</th>
                <th className="px-2 py-1.5 font-bold text-white">Pt</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([tid, s], i) => {
                const team = teamMap[tid]
                return (
                  <tr key={tid} className="border-b border-gray-700/40">
                    <td className="px-3 py-1.5 text-gray-500">{i + 1}</td>
                    <td className="px-3 py-1.5 flex items-center gap-1.5">
                      {team && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />}
                      <span className="text-white">{team?.name || tid}</span>
                    </td>
                    <td className="text-center px-2 py-1.5 text-gray-400">{s.played}</td>
                    <td className="text-center px-2 py-1.5 text-emerald-400">{s.w}</td>
                    <td className="text-center px-2 py-1.5 text-gray-400">{s.d}</td>
                    <td className="text-center px-2 py-1.5 text-red-400">{s.l}</td>
                    <td className="text-center px-2 py-1.5 font-bold text-white">{s.pts}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Partite per Turno</div>
        {Object.entries(byRound).map(([round, ms]) => (
          <div key={round} className="mb-3">
            <div className="text-[10px] text-gray-500 mb-1.5 font-medium">{round}</div>
            <div className="space-y-1">
              {ms.map(m => <DEMatchRow key={m.id} match={m} teams={teams} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main bracket ─────────────────────────────────────────────────────────────

export default function BracketView() {
  const { state } = useTournament()
  const { matches, teams, format } = state

  if (format?.type === 'double_roundrobin') return <CombinedStandings matches={matches} teams={teams} />
  if (format?.type === 'roundrobin_placement') return <PlacementView matches={matches} teams={teams} />
  if (format?.type === 'double_elimination') return <DoubleEliminationView matches={matches} teams={teams} />
  if (format?.type === 'swiss') return <SwissView matches={matches} teams={teams} />

  const knockoutAll = matches.filter(m => m.phase === 'knockout' || m.bracket === 'knockout')
  const thirdPlace  = knockoutAll.filter(m => m.round === '3° Posto')
  const knockout    = knockoutAll.filter(m => m.round !== '3° Posto')
  const groupMats   = matches.filter(m => m.phase === 'group')

  // Compute rounds in order
  const roundNames = [...new Set(knockout.map(m => m.round))]
  const rounds     = roundNames.map(r => knockout.filter(m => m.round === r))

  const maxMatches = rounds.length > 0 ? rounds[0].length : 0
  const totalH     = maxMatches * (CARD_H + GAP)
  const svgW       = rounds.length * COL_STEP + CARD_W
  const svgH       = totalH + (thirdPlace.length > 0 ? CARD_H + 48 : 0)

  if (rounds.length === 0 && groupMats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-2">
        <Trophy size={32} />
        <p className="text-sm">Nessuna fase a tabellone nel formato attuale.</p>
        <p className="text-xs">Crea partite knockout nel formato per vedere il tabellone.</p>
      </div>
    )
  }

  return (
    <div className="flex gap-6 p-4 overflow-auto h-full">
      {/* Bracket SVG */}
      {rounds.length > 0 && (
        <div className="flex-shrink-0">
          {/* Round labels */}
          <div className="flex gap-0 mb-2" style={{ width: svgW }}>
            {rounds.map((_, ri) => (
              <div key={ri} style={{ width: CARD_W, marginRight: CONN_W + COL_GAP }}
                className="text-[10px] font-bold uppercase tracking-wider text-gray-500 text-center">
                {roundNames[ri]}
              </div>
            ))}
          </div>
          <svg width={svgW} height={svgH} className="overflow-visible">
            {/* Connection lines */}
            {rounds.map((roundMatches, ri) => {
              if (ri === rounds.length - 1) return null
              const xStart = ri * COL_STEP + CARD_W
              const xMid   = xStart + CONN_W / 2
              const xEnd   = (ri + 1) * COL_STEP

              return roundMatches.map((_, mi) => {
                if (mi % 2 === 1) return null  // draw only for even-indexed (top of pair)
                const yA   = yCenter(ri, mi)
                const yB   = yCenter(ri, mi + 1)
                const yMid = (yA + yB) / 2
                const hasResults = rounds[ri][mi]?.result?.status === 'played' && rounds[ri][mi+1]?.result?.status === 'played'
                const lineColor  = hasResults ? '#10B981' : '#374151'

                return (
                  <g key={mi}>
                    <line x1={xStart} y1={yA}   x2={xMid} y2={yA}   stroke={lineColor} strokeWidth="1.5" />
                    <line x1={xStart} y1={yB}   x2={xMid} y2={yB}   stroke={lineColor} strokeWidth="1.5" />
                    <line x1={xMid}   y1={yA}   x2={xMid} y2={yB}   stroke={lineColor} strokeWidth="1.5" />
                    <line x1={xMid}   y1={yMid} x2={xEnd} y2={yMid} stroke={lineColor} strokeWidth="1.5" />
                  </g>
                )
              })
            })}

            {/* Match cards */}
            {rounds.map((roundMatches, ri) =>
              roundMatches.map((match, mi) => (
                <BracketCard
                  key={match.id}
                  match={match}
                  x={ri * COL_STEP}
                  y={yCenter(ri, mi) - CARD_H / 2}
                />
              ))
            )}

            {/* Third place */}
            {thirdPlace.map(m => (
              <ThirdPlaceCard key={m.id} match={m} totalHeight={totalH} />
            ))}
          </svg>
        </div>
      )}

      {/* Group standings panel */}
      {groupMats.length > 0 && (
        <div className="flex-shrink-0 w-80">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Classifiche Gironi</div>
          <GroupStandings matches={groupMats} teams={teams} />
          <p className="text-[10px] text-gray-600 mt-2">
            Inserisci i risultati nei match del calendario per aggiornare le classifiche e avanzare le squadre al tabellone.
          </p>
        </div>
      )}
    </div>
  )
}
