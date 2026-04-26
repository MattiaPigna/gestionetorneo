import { useRef, useState } from 'react'
import { useTournament } from '../store/tournamentStore'
import ScheduleGrid from './ScheduleGrid'
import MatchSidebar from './MatchSidebar'
import AlertPanel from './AlertPanel'
import BracketView from './BracketView'
import CloudModal from './CloudModal'
import { minutesToLabel } from '../utils/time'
import {
  Wand2, RotateCcw, Trophy, Upload, Settings,
  CheckCircle, ChevronDown, ChevronUp, Timer,
  Hash, CalendarDays, CalendarRange, Network,
  Cloud, CloudCheck
} from 'lucide-react'

// ─── Constraints quick-edit panel ────────────────────────────────────────────

function ConstraintsBar() {
  const { state, dispatch } = useTournament()
  const { constraints } = state
  const [open, setOpen] = useState(false)
  const upd = (key, val) => dispatch({ type: 'UPDATE_CONSTRAINTS', payload: { [key]: val } })

  const REST_PRESETS = [0, 15, 30, 45, 60, 90, 120]

  return (
    <div className="border-b border-gray-700 bg-gray-900/80">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-2 text-xs text-gray-400 hover:text-gray-200 transition-colors"
      >
        <Settings size={12} />
        <span className="font-medium">Regole del torneo</span>
        <div className="flex gap-3 ml-2 text-gray-500">
          <span className="flex items-center gap-1">
            <Timer size={10} />
            Riposo: <span className="text-blue-400 font-semibold ml-0.5">{minutesToLabel(constraints.minRestMinutes)}</span>
          </span>
          <span className="flex items-center gap-1">
            <Hash size={10} />
            Max/giorno: <span className="text-blue-400 font-semibold ml-0.5">{constraints.maxMatchesPerDay}</span>
          </span>
          <span className="flex items-center gap-1">
            <CalendarDays size={10} />
            Doppio: <span className={`font-semibold ml-0.5 ${constraints.allowDoubleDay ? 'text-emerald-400' : 'text-red-400'}`}>
              {constraints.allowDoubleDay ? 'sì' : 'no'}
            </span>
          </span>
        </div>
        <div className="flex-1" />
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 grid grid-cols-3 gap-6 border-t border-gray-800">
          {/* Rest minutes */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-300 mb-2">
              <Timer size={12} className="text-blue-400" />
              Riposo minimo tra partite (stessa squadra)
            </label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="number" min={0} max={300} step={5}
                className="w-16 bg-gray-800 border border-gray-600 rounded-lg px-2 py-1 text-white text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={constraints.minRestMinutes}
                onChange={e => upd('minRestMinutes', Math.max(0, parseInt(e.target.value) || 0))}
              />
              <span className="text-gray-400 text-xs">minuti</span>
            </div>
            <input
              type="range" min={0} max={180} step={15}
              className="w-full accent-blue-500 mb-2"
              value={constraints.minRestMinutes}
              onChange={e => upd('minRestMinutes', parseInt(e.target.value))}
            />
            <div className="flex gap-1 flex-wrap">
              {REST_PRESETS.map(p => (
                <button key={p} onClick={() => upd('minRestMinutes', p)}
                  className={`px-2 py-0.5 rounded text-[10px] transition-all ${
                    constraints.minRestMinutes === p ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {p === 0 ? 'No' : `${p}min`}
                </button>
              ))}
            </div>
          </div>

          {/* Max per day */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-300 mb-2">
              <Hash size={12} className="text-blue-400" />
              Partite massime al giorno
            </label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="number" min={1} max={30}
                className="w-16 bg-gray-800 border border-gray-600 rounded-lg px-2 py-1 text-white text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={constraints.maxMatchesPerDay}
                onChange={e => upd('maxMatchesPerDay', Math.max(1, parseInt(e.target.value) || 1))}
              />
              <span className="text-gray-400 text-xs">partite</span>
            </div>
            <input
              type="range" min={1} max={20}
              className="w-full accent-blue-500"
              value={constraints.maxMatchesPerDay}
              onChange={e => upd('maxMatchesPerDay', parseInt(e.target.value))}
            />
          </div>

          {/* Allow double day */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-300 mb-3">
              <CalendarDays size={12} className="text-blue-400" />
              Doppio giorno (stessa squadra)
            </label>
            <button
              onClick={() => upd('allowDoubleDay', !constraints.allowDoubleDay)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                constraints.allowDoubleDay
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-red-900/60 hover:bg-red-900 text-red-300 border border-red-700/50'
              }`}
            >
              <span className={`w-3 h-3 rounded-full ${constraints.allowDoubleDay ? 'bg-emerald-300' : 'bg-red-400'}`} />
              {constraints.allowDoubleDay ? 'Consentito' : 'Vietato'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main builder ─────────────────────────────────────────────────────────────

export default function TournamentBuilder() {
  const { state, dispatch } = useTournament()
  const { config, matches, schedule, violations } = state
  const fileRef = useRef()
  const [activeTab, setActiveTab] = useState('calendar')
  const [cloudOpen, setCloudOpen] = useState(false)
  const [savedId, setSavedId] = useState(null)
  const [savedName, setSavedName] = useState('')

  const scheduledCount = Object.keys(schedule).length
  const hasErrors = violations && violations.some(v => v.severity === 'error')

  const handleClearSchedule = () => {
    if (confirm('Vuoi svuotare il calendario? Le partite rimarranno disponibili.')) {
      dispatch({ type: 'CLEAR_SCHEDULE' })
    }
  }

  const handleLoadJSON = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        dispatch({ type: 'LOAD_STATE', payload: data })
      } catch {
        alert('File JSON non valido')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top Bar */}
      <header className="flex-shrink-0 bg-gray-900 border-b border-gray-700 px-4 py-2.5 flex items-center gap-3">
        <div className="flex items-center gap-2 mr-2">
          <div className="w-8 h-8 bg-blue-500/20 rounded-xl flex items-center justify-center">
            <Trophy size={16} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">{config.name}</h1>
            <div className="text-[10px] text-gray-500">{config.sport} · {config.numDays}g · {matches.length}p</div>
          </div>
        </div>

        <div className="flex-1" />

        {/* Progress */}
        <div className="flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-1.5">
          <div className="w-24 h-1.5 bg-gray-600 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${matches.length ? (scheduledCount / matches.length) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs text-gray-300">{scheduledCount}/{matches.length}</span>
        </div>

        <button
          onClick={() => dispatch({ type: 'AUTO_SCHEDULE' })}
          className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1.5 rounded-xl transition-all"
        >
          <Wand2 size={14} /> Auto-pianifica
        </button>

        <button
          onClick={handleClearSchedule}
          className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm px-3 py-1.5 rounded-xl transition-all"
          title="Svuota calendario"
        >
          <RotateCcw size={14} />
        </button>

        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm px-3 py-1.5 rounded-xl transition-all"
          title="Carica torneo JSON"
        >
          <Upload size={14} />
        </button>
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleLoadJSON} />

        <button
          onClick={() => setCloudOpen(true)}
          className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl transition-all ${
            savedId
              ? 'bg-blue-500/20 border border-blue-500/40 text-blue-300 hover:bg-blue-500/30'
              : 'bg-gray-700 hover:bg-gray-600 text-white'
          }`}
          title={savedId ? `Salvato: ${savedName}` : 'Salva/carica nel cloud'}
        >
          {savedId ? <CloudCheck size={14} /> : <Cloud size={14} />}
          {savedId ? 'Cloud' : 'Cloud'}
        </button>

        <button
          onClick={() => dispatch({ type: 'SET_STEP', payload: 'export' })}
          className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl transition-all ${
            hasErrors
              ? 'bg-red-700 hover:bg-red-800 text-white'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
        >
          {hasErrors ? <Settings size={14} /> : <CheckCircle size={14} />}
          Esporta
        </button>

        <button
          onClick={() => dispatch({ type: 'SET_STEP', payload: 'setup' })}
          className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-gray-700 transition-all"
        >
          Impostazioni
        </button>
      </header>

      {/* Constraints quick-edit */}
      <ConstraintsBar />

      {/* Alert */}
      {violations && violations.length > 0 && (
        <div className="flex-shrink-0 px-4 pt-2">
          <AlertPanel />
        </div>
      )}

      {/* Tab bar */}
      <div className="flex-shrink-0 flex items-center gap-1 px-4 py-2 bg-gray-900 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'calendar'
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
          }`}
        >
          <CalendarRange size={13} />
          Calendario
        </button>
        <button
          onClick={() => setActiveTab('bracket')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'bracket'
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
          }`}
        >
          <Network size={13} />
          Tabellone
        </button>
      </div>

      {/* Main Content */}
      {activeTab === 'calendar' ? (
        <div className="flex flex-1 gap-4 p-4 overflow-hidden">
          <MatchSidebar />
          <div className="flex-1 flex flex-col gap-2 overflow-hidden">
            <div className="text-xs text-gray-500 bg-gray-800/60 rounded-lg px-3 py-1.5 self-start">
              Trascina le partite nelle celle · Clicca sugli orari per modificarli
            </div>
            <ScheduleGrid />
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-4">
          <BracketView />
        </div>
      )}

      {cloudOpen && (
        <CloudModal
          savedId={savedId}
          onSaved={(id, name) => { setSavedId(id); setSavedName(name) }}
          onLoaded={(id, name) => { setSavedId(id); setSavedName(name) }}
          onClose={() => setCloudOpen(false)}
        />
      )}
    </div>
  )
}
