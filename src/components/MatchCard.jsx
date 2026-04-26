import { useState } from 'react'
import { useTournament } from '../store/tournamentStore'
import { placeholderLabel } from '../utils/placeholders'
import { X, GripVertical, AlertTriangle, Check, Pencil } from 'lucide-react'

const ROUND_COLORS = {
  'Girone':            'from-blue-900/60 to-blue-800/40 border-blue-700/50',
  'Girone A':          'from-blue-900/60 to-blue-800/40 border-blue-700/50',
  'Girone B':          'from-purple-900/60 to-purple-800/40 border-purple-700/50',
  'Girone C':          'from-emerald-900/60 to-emerald-800/40 border-emerald-700/50',
  'Girone D':          'from-teal-900/60 to-teal-800/40 border-teal-700/50',
  'Ottavi di Finale':  'from-sky-900/60 to-sky-800/40 border-sky-700/50',
  'Quarti di Finale':  'from-indigo-900/60 to-indigo-800/40 border-indigo-700/50',
  'Semifinale':        'from-amber-900/60 to-amber-800/40 border-amber-700/50',
  'Semifinali':        'from-amber-900/60 to-amber-800/40 border-amber-700/50',
  'Finale':            'from-emerald-900/60 to-emerald-800/40 border-emerald-700/50',
  '3° Posto':          'from-orange-900/60 to-orange-800/40 border-orange-700/50',
}

// ─── Inline result editor ─────────────────────────────────────────────────────

function ResultEditor({ match, onClose }) {
  const { dispatch } = useTournament()
  const [s1, setS1] = useState(match.result?.score1 ?? '')
  const [s2, setS2] = useState(match.result?.score2 ?? '')

  const save = () => {
    dispatch({ type: 'SET_RESULT', payload: { matchId: match.id, score1: s1, score2: s2 } })
    onClose()
  }

  const clear = () => {
    dispatch({ type: 'SET_RESULT', payload: { matchId: match.id, score1: '', score2: '' } })
    onClose()
  }

  return (
    <div
      className="absolute inset-0 z-20 bg-gray-900/95 rounded-xl p-2 flex flex-col gap-2"
      onClick={e => e.stopPropagation()}
    >
      <div className="text-[10px] text-gray-400 text-center font-semibold uppercase tracking-wider">{match.label} — Risultato</div>
      <div className="flex items-center gap-2 justify-center">
        <input
          autoFocus
          type="number" min="0"
          className="w-12 bg-gray-700 border border-gray-500 rounded-lg text-white text-center text-sm py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
          value={s1}
          onChange={e => setS1(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          placeholder="0"
        />
        <span className="text-gray-500 font-bold">-</span>
        <input
          type="number" min="0"
          className="w-12 bg-gray-700 border border-gray-500 rounded-lg text-white text-center text-sm py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
          value={s2}
          onChange={e => setS2(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          placeholder="0"
        />
      </div>
      <div className="flex gap-1.5">
        <button onClick={clear} className="flex-1 text-xs py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-all">Cancella</button>
        <button onClick={save} className="flex-1 text-xs py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center gap-1 transition-all">
          <Check size={10} /> Salva
        </button>
        <button onClick={onClose} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-400 rounded-lg text-xs transition-all">✕</button>
      </div>
    </div>
  )
}

// ─── Team row ─────────────────────────────────────────────────────────────────

function TeamRow({ team, ref: refObj, rawPlaceholder, score, isWinner, isDraw }) {
  const isReal      = !!team
  const isResolved  = !isReal && !!refObj && refObj.type !== 'tbd' // placeholder but resolved via ref
  const isPending   = !isReal && !isResolved

  let nameEl
  if (isReal) {
    nameEl = <span className="text-sm text-white font-medium truncate">{team.name}</span>
  } else if (rawPlaceholder) {
    const label = refObj ? placeholderLabel(refObj) : rawPlaceholder
    const colorCls = refObj?.type === 'group_rank'   ? 'text-amber-400'
                   : refObj?.type === 'match_winner' ? 'text-emerald-400'
                   : refObj?.type === 'match_loser'  ? 'text-red-400'
                   : 'text-gray-500'
    nameEl = <span className={`text-xs italic truncate ${colorCls} opacity-80`}>{label}</span>
  } else {
    nameEl = <span className="text-xs italic text-gray-600 truncate">Da definire</span>
  }

  return (
    <div className={`flex items-center gap-2 rounded px-1 py-0.5 transition-colors ${
      isWinner ? 'bg-emerald-900/30' : isDraw ? 'bg-gray-700/20' : ''
    }`}>
      {isReal
        ? <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />
        : <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 border ${
            refObj?.type === 'group_rank'   ? 'border-amber-500/60'
          : refObj?.type === 'match_winner' ? 'border-emerald-500/60'
          : refObj?.type === 'match_loser'  ? 'border-red-500/60'
          : 'border-gray-600'}`} />
      }
      {nameEl}
      {score !== undefined && score !== '' && (
        <span className={`ml-auto font-bold text-sm flex-shrink-0 ${isWinner ? 'text-emerald-300' : 'text-gray-300'}`}>
          {score}
        </span>
      )}
      {isWinner && <Check size={9} className="text-emerald-400 flex-shrink-0" />}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MatchCard({ matchId, compact = false, hasViolation = false }) {
  const { state, dispatch } = useTournament()
  const [editingResult, setEditingResult] = useState(false)

  const match = state.matches.find(m => m.id === matchId)
  if (!match) return null

  const team1 = state.teams.find(t => t.id === (match.team1Id || match.resolvedTeam1Id))
  const team2 = state.teams.find(t => t.id === (match.team2Id || match.resolvedTeam2Id))

  const res       = match.result
  const played    = res?.status === 'played'
  const s1        = played ? res.score1 : undefined
  const s2        = played ? res.score2 : undefined
  const win1      = played && res.winnerId === (match.team1Id || match.resolvedTeam1Id)
  const win2      = played && res.winnerId === (match.team2Id || match.resolvedTeam2Id)
  const isDraw    = played && !res.winnerId && s1 !== undefined

  const colorClass = ROUND_COLORS[match.round] || 'from-gray-800/60 to-gray-700/40 border-gray-600/50'
  const isKnockout = match.bracket === 'knockout'

  const handleDragStart = (e) => {
    e.dataTransfer.setData('matchId', matchId)
    e.dataTransfer.effectAllowed = 'move'
    setTimeout(() => e.target.classList.add('match-card-dragging'), 0)
  }
  const handleDragEnd   = (e) => e.target.classList.remove('match-card-dragging')
  const unschedule      = (e) => { e.stopPropagation(); dispatch({ type: 'UNSCHEDULE_MATCH', payload: matchId }) }

  if (compact) {
    return (
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={`
          bg-gradient-to-br ${colorClass} border rounded-lg px-2 py-1.5 cursor-grab active:cursor-grabbing
          select-none transition-all hover:scale-[1.02] group relative
          ${hasViolation ? 'ring-2 ring-red-500/70' : ''}
          ${played ? 'ring-1 ring-emerald-700/40' : ''}
        `}
      >
        {hasViolation && <AlertTriangle size={9} className="absolute top-1 right-5 text-red-400" />}
        <div className="flex items-center gap-1">
          <GripVertical size={10} className="text-gray-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[9px] font-bold text-gray-400 uppercase">{match.label}</div>
            <CompactTeamRow
              team={team1} ref1={match.ref1} ph={match.placeholder1}
              score={s1} isWinner={win1}
            />
            <div className="text-[9px] text-gray-600 pl-1">vs</div>
            <CompactTeamRow
              team={team2} ref1={match.ref2} ph={match.placeholder2}
              score={s2} isWinner={win2}
            />
          </div>
          <button onClick={unschedule} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 ml-1">
            <X size={11} />
          </button>
        </div>
        {!isKnockout && (
          <div className="flex gap-1 mt-1 ml-3.5">
            <span className="h-0.5 rounded-full flex-1" style={{ backgroundColor: team1?.color || '#444' }} />
            <span className="h-0.5 rounded-full flex-1" style={{ backgroundColor: team2?.color || '#444' }} />
          </div>
        )}
      </div>
    )
  }

  // Full card
  return (
    <div
      draggable={!editingResult}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`
        bg-gradient-to-br ${colorClass} border rounded-xl p-3 select-none transition-all
        ${editingResult ? 'cursor-default' : 'cursor-grab active:cursor-grabbing hover:scale-[1.01]'}
        ${hasViolation ? 'ring-2 ring-red-500/70' : ''}
        relative group
      `}
    >
      {editingResult && (
        <ResultEditor match={match} onClose={() => setEditingResult(false)} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{match.round}</span>
          <div className="text-xs font-bold text-gray-300">{match.label}</div>
        </div>
        <div className="flex items-center gap-1">
          {played && <span className="text-[9px] bg-emerald-900/60 text-emerald-300 px-1.5 py-0.5 rounded-full">✓</span>}
          <button
            onClick={() => setEditingResult(true)}
            className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-blue-400 transition-all"
            title="Inserisci risultato"
          >
            <Pencil size={11} />
          </button>
          <GripVertical size={13} className="text-gray-500" />
        </div>
      </div>

      {/* Teams */}
      <div className="space-y-0.5">
        <TeamRow team={team1} ref={match.ref1} rawPlaceholder={match.placeholder1} score={s1} isWinner={win1} isDraw={isDraw} />
        <div className="text-center text-gray-600 text-[10px]">vs</div>
        <TeamRow team={team2} ref={match.ref2} rawPlaceholder={match.placeholder2} score={s2} isWinner={win2} isDraw={isDraw} />
      </div>

      {/* Score summary if played */}
      {played && (
        <div className="mt-2 text-center text-[10px] text-gray-500">
          {isDraw ? 'Pareggio' : `Vince: ${state.teams.find(t => t.id === res.winnerId)?.name || '?'}`}
        </div>
      )}
    </div>
  )
}

function CompactTeamRow({ team, ref1, ph, score, isWinner }) {
  const name = team?.name
    || (ref1 ? placeholderLabel(ref1) : ph)
    || '?'
  const colorCls = team ? '' : 'text-gray-500 italic'
  return (
    <div className={`flex items-center gap-1 text-[10px] ${isWinner ? 'text-emerald-300 font-bold' : 'text-gray-200'}`}>
      {team && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />}
      <span className={`truncate ${colorCls}`}>{name}</span>
      {score !== undefined && score !== '' && <span className="ml-auto font-bold">{score}</span>}
    </div>
  )
}
