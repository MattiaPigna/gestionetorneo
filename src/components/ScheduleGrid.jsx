import { useState, useRef } from 'react'
import { useTournament } from '../store/tournamentStore'
import MatchCard from './MatchCard'
import { calcSlotTime } from '../utils/time'
import { formatDateShort } from '../utils/dates'
import { Clock, Pencil } from 'lucide-react'

export { calcSlotTime }

// ─── Editable time label ─────────────────────────────────────────────────────

function EditableTime({ slotIdx }) {
  const { state, dispatch } = useTournament()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef()
  const currentTime = calcSlotTime(state.config, slotIdx)
  const isOverridden = !!state.config.slotTimes?.[slotIdx]

  const startEdit = () => {
    setDraft(currentTime)
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const commit = () => {
    setEditing(false)
    if (draft && /^\d{2}:\d{2}$/.test(draft) && draft !== calcSlotTime({ ...state.config, slotTimes: {} }, slotIdx)) {
      dispatch({ type: 'SET_SLOT_TIME', payload: { slotIdx, time: draft } })
    } else if (!draft || draft === calcSlotTime({ ...state.config, slotTimes: {} }, slotIdx)) {
      dispatch({ type: 'SET_SLOT_TIME', payload: { slotIdx, time: null } })
    }
  }

  const reset = (e) => {
    e.stopPropagation()
    dispatch({ type: 'SET_SLOT_TIME', payload: { slotIdx, time: null } })
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="time"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        className="w-14 bg-gray-700 border border-blue-500 rounded px-1 py-0.5 text-xs text-white font-mono focus:outline-none"
      />
    )
  }

  return (
    <button
      onClick={startEdit}
      title="Clicca per modificare l'orario"
      className={`group/time flex items-center gap-1 text-xs rounded px-1 py-0.5 transition-all
        ${isOverridden ? 'text-blue-300 font-semibold' : 'text-gray-500'}
        hover:bg-gray-800 hover:text-gray-200`}
    >
      <Clock size={9} className="flex-shrink-0" />
      <span className="font-mono">{currentTime}</span>
      <Pencil size={8} className="opacity-0 group-hover/time:opacity-60 flex-shrink-0" />
      {isOverridden && (
        <span
          onClick={reset}
          className="ml-0.5 text-gray-500 hover:text-red-400 text-[9px] leading-none"
          title="Ripristina orario automatico"
        >✕</span>
      )}
    </button>
  )
}

// ─── Drop cell ───────────────────────────────────────────────────────────────

function DropCell({ dayIdx, slotIdx, matchId, hasViolation, isOver }) {
  const { dispatch } = useTournament()

  return (
    <div
      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
      onDrop={e => {
        e.preventDefault()
        const dragged = e.dataTransfer.getData('matchId')
        if (dragged) dispatch({ type: 'PLACE_MATCH', payload: { matchId: dragged, dayIdx, slotIdx } })
      }}
      className={`
        min-h-[72px] border rounded-xl transition-all relative
        ${matchId ? 'border-transparent' : 'border-dashed border-gray-700 hover:border-blue-500/40 hover:bg-blue-950/10'}
        ${isOver ? 'ring-2 ring-blue-400 bg-blue-950/30' : ''}
      `}
    >
      {matchId
        ? <MatchCard matchId={matchId} compact hasViolation={hasViolation} />
        : <div className="absolute inset-0 flex items-center justify-center text-gray-700 text-lg select-none">+</div>
      }
    </div>
  )
}

// ─── Main grid ───────────────────────────────────────────────────────────────

export default function ScheduleGrid() {
  const { state } = useTournament()
  const { config, schedule, violations } = state
  const [dragOverKey, setDragOverKey] = useState(null)

  const { numDays, slotsPerDay } = config
  const violatedIds = new Set((violations || []).flatMap(v => v.matchIds))
  const days = Array.from({ length: numDays }, (_, i) => i)
  const slots = Array.from({ length: slotsPerDay }, (_, i) => i)

  return (
    <div className="flex-1 overflow-x-auto overflow-y-auto">
      <div className="min-w-max">
        {/* Day headers */}
        <div className="flex gap-2 mb-2 sticky top-0 z-10 bg-gray-950 pb-2">
          <div className="w-[72px] flex-shrink-0" />
          {days.map(d => {
            const cnt = Object.keys(schedule).filter(k => k.startsWith(`d${d}-`)).length
            const dateStr = config.playingDays?.[d]
            return (
              <div key={d} className="w-44 flex-shrink-0">
                <div className="bg-gray-800 rounded-xl px-3 py-2 text-center">
                  {dateStr ? (
                    <>
                      <div className="text-xs font-bold text-blue-400">{formatDateShort(dateStr)}</div>
                      <div className="text-[10px] text-gray-600">Giorno {d + 1}</div>
                    </>
                  ) : (
                    <div className="text-xs font-bold uppercase tracking-wider text-blue-400">Giorno {d + 1}</div>
                  )}
                  <div className="text-xs text-gray-500 mt-0.5">{cnt} partite</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Slot rows */}
        {slots.map(s => (
          <div key={s} className="flex gap-2 mb-1.5">
            {/* Editable time label */}
            <div className="w-[72px] flex-shrink-0 flex items-center justify-end pr-1">
              <EditableTime slotIdx={s} />
            </div>

            {/* Day cells */}
            {days.map(d => {
              const key = `d${d}-s${s}`
              const matchId = schedule[key]
              return (
                <div
                  key={d}
                  className="w-44 flex-shrink-0"
                  onDragEnter={() => setDragOverKey(key)}
                  onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverKey(null) }}
                >
                  <DropCell
                    dayIdx={d} slotIdx={s}
                    matchId={matchId}
                    hasViolation={matchId ? violatedIds.has(matchId) : false}
                    isOver={dragOverKey === key}
                  />
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
