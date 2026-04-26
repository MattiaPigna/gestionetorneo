import { useState } from 'react'
import { useTournament } from '../store/tournamentStore'
import { placeholderLabel } from '../utils/placeholders'
import { Check, Pencil, Trophy } from 'lucide-react'

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

// ─── Main bracket ─────────────────────────────────────────────────────────────

export default function BracketView() {
  const { state } = useTournament()
  const { matches, teams } = state

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
