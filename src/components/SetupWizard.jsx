import { useState } from 'react'
import { useTournament } from '../store/tournamentStore'
import FormatTextEditor from './FormatTextEditor'
import { allDatesInRange, computePlayingDays, dowMon, buildCalendarCells, getMonthLabel } from '../utils/dates'
import {
  Trophy, Users, Settings, ChevronRight, ChevronLeft,
  Plus, Trash2, Shuffle, Wand2
} from 'lucide-react'

const SPORTS = ['Calcio', 'Pallavolo', 'Basket', 'Tennis', 'Padel', 'Rugby', 'Altro']

function StepIndicator({ current, total }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
            ${i < current ? 'bg-emerald-500 text-white' : i === current ? 'bg-blue-500 text-white ring-4 ring-blue-500/30' : 'bg-gray-700 text-gray-400'}
          `}>
            {i < current ? '✓' : i + 1}
          </div>
          {i < total - 1 && <div className={`w-10 h-0.5 ${i < current ? 'bg-emerald-500' : 'bg-gray-700'}`} />}
        </div>
      ))}
    </div>
  )
}

// ─── Excluded-days calendar ───────────────────────────────────────────────────

function MonthCalendar({ dates, allRangeDates, excludedSet, onToggle }) {
  const cells = buildCalendarCells(dates, allRangeDates)
  return (
    <div>
      <div className="text-xs font-semibold text-gray-400 mb-1">{getMonthLabel(dates[0])}</div>
      <div className="grid grid-cols-7 gap-px">
        {['L','M','M','G','V','S','D'].map((d, i) => (
          <div key={i} className="text-center text-[9px] text-gray-600 pb-0.5">{d}</div>
        ))}
        {cells.map(({ dateStr, inRange }) => {
          if (!inRange) return <div key={dateStr} />
          const day = parseInt(dateStr.split('-')[2])
          const excluded = excludedSet.has(dateStr)
          return (
            <button
              key={dateStr}
              onClick={() => onToggle(dateStr)}
              title={excluded ? 'Click per includere' : 'Click per escludere'}
              className={`h-6 rounded text-[10px] font-medium transition-all ${
                excluded
                  ? 'bg-red-900/50 text-red-400/60 line-through'
                  : 'bg-emerald-900/40 text-emerald-300 hover:bg-red-900/40 hover:text-red-400'
              }`}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ExcludedDaysPicker({ startDate, endDate, excludedDates, onChange }) {
  const allDates   = allDatesInRange(startDate, endDate)
  const excludedSet = new Set(excludedDates)

  const toggle = (dateStr) => {
    onChange(excludedSet.has(dateStr)
      ? excludedDates.filter(d => d !== dateStr)
      : [...excludedDates, dateStr])
  }

  const toggleWeekdays = (dows) => {
    const targets = allDates.filter(d => dows.includes(dowMon(d)))
    const allExcl = targets.length > 0 && targets.every(d => excludedSet.has(d))
    if (allExcl) {
      onChange(excludedDates.filter(d => !targets.includes(d)))
    } else {
      const toAdd = targets.filter(d => !excludedSet.has(d))
      onChange([...excludedDates, ...toAdd])
    }
  }

  // Group by year-month
  const monthGroups = {}
  allDates.forEach(d => {
    const key = d.slice(0, 7)
    if (!monthGroups[key]) monthGroups[key] = []
    monthGroups[key].push(d)
  })

  const playingCount = allDates.filter(d => !excludedSet.has(d)).length
  const excludedCount = excludedDates.filter(d => allDates.includes(d)).length

  const quickBtns = [
    { label: 'Sabati',    dows: [5] },
    { label: 'Domeniche', dows: [6] },
    { label: 'Weekend',   dows: [5, 6] },
  ]

  return (
    <div className="space-y-3">
      {/* Quick buttons */}
      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-xs text-gray-500">Escludi:</span>
        {quickBtns.map(({ label, dows }) => {
          const targets = allDates.filter(d => dows.includes(dowMon(d)))
          const allExcl = targets.length > 0 && targets.every(d => excludedSet.has(d))
          return (
            <button
              key={label}
              onClick={() => toggleWeekdays(dows)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                allExcl
                  ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/40'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {allExcl ? '✓ ' : ''}{label}
            </button>
          )
        })}
        {excludedCount > 0 && (
          <button
            onClick={() => onChange([])}
            className="px-2.5 py-1 rounded-lg text-xs text-red-400 hover:bg-red-900/20 transition-all ml-auto"
          >
            Azzera ({excludedCount})
          </button>
        )}
      </div>

      {/* Calendar months */}
      <div className="space-y-4 max-h-72 overflow-y-auto pr-1 rounded-xl bg-gray-800/40 p-3">
        {Object.entries(monthGroups).map(([key, dates]) => (
          <MonthCalendar
            key={key}
            dates={dates}
            allRangeDates={allDates}
            excludedSet={excludedSet}
            onToggle={toggle}
          />
        ))}
      </div>

      {/* Summary */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-emerald-400 font-bold text-sm">{playingCount}</span>
        <span className="text-gray-400">giorni di gioco</span>
        {excludedCount > 0 && (
          <span className="text-red-400 ml-1">· {excludedCount} esclusi</span>
        )}
        <span className="text-gray-600">· {allDates.length} totali</span>
      </div>
    </div>
  )
}

// ─── Step 1: Configurazione base ─────────────────────────────────────────────

function Step1({ onNext }) {
  const { state, dispatch } = useTournament()
  const { config } = state
  const upd = (payload) => dispatch({ type: 'UPDATE_CONFIG', payload })

  const hasDates = config.startDate && config.endDate

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Nome del Torneo</label>
        <input
          className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={config.name}
          onChange={e => upd({ name: e.target.value })}
          placeholder="Es: Torneo Primavera 2025"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Sport</label>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {SPORTS.map(s => (
            <button key={s}
              onClick={() => upd({ sport: s })}
              className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                config.sport === s ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Date range */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Date del torneo</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-gray-500 mb-1">Inizio</div>
            <input type="date"
              className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={config.startDate}
              onChange={e => upd({ startDate: e.target.value })}
            />
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Fine</div>
            <input type="date"
              className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={config.endDate}
              min={config.startDate}
              onChange={e => upd({ endDate: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Excluded days calendar — only when both dates are set */}
      {hasDates && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Giorni non giocabili
            <span className="ml-2 text-xs font-normal text-gray-500">(click per escludere)</span>
          </label>
          <ExcludedDaysPicker
            startDate={config.startDate}
            endDate={config.endDate}
            excludedDates={config.excludedDates || []}
            onChange={excluded => upd({ excludedDates: excluded })}
          />
        </div>
      )}

      {/* Fallback: manual day count when no dates */}
      {!hasDates && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Giorni del torneo
            <span className="ml-2 text-xs font-normal text-gray-500">(oppure imposta le date sopra)</span>
          </label>
          <input type="number" min="1" max="30"
            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={config.numDays}
            onChange={e => upd({ numDays: parseInt(e.target.value) || 1 })}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Ora inizio</label>
          <input type="time"
            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={config.startTime}
            onChange={e => upd({ startTime: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Durata partita (min)</label>
          <input type="number" min="20" max="180" step="5"
            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={config.matchDurationMinutes}
            onChange={e => upd({ matchDurationMinutes: parseInt(e.target.value) || 60 })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Slot per giorno</label>
          <input type="number" min="1" max="16"
            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={config.slotsPerDay}
            onChange={e => upd({ slotsPerDay: parseInt(e.target.value) || 8 })}
          />
        </div>
      </div>

      <button
        onClick={onNext}
        disabled={!config.name.trim()}
        className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
      >
        Avanti <ChevronRight size={18} />
      </button>
    </div>
  )
}

// ─── Step 2: Squadre ─────────────────────────────────────────────────────────

function Step2({ onNext, onBack }) {
  const { state, dispatch } = useTournament()
  const [newName, setNewName] = useState('')

  const addTeam = () => {
    if (!newName.trim()) return
    dispatch({ type: 'ADD_TEAM', payload: newName.trim() })
    setNewName('')
  }

  const quickFill = (n) => {
    const names = Array.from({ length: n }, (_, i) => `Squadra ${String.fromCharCode(65 + i)}`)
    dispatch({ type: 'SET_TEAMS', payload: names })
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {[4, 6, 8, 12, 16].map(n => (
          <button key={n} onClick={() => quickFill(n)}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-sm rounded-lg text-gray-200 transition-all flex items-center gap-1"
          >
            <Shuffle size={12} /> {n} squadre
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTeam()}
          placeholder="Nome squadra..."
        />
        <button onClick={addTeam}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl transition-all"
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
        {state.teams.map((team, i) => (
          <div key={team.id} className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-2.5">
            <span className="text-gray-400 text-sm w-5 flex-shrink-0">{i + 1}.</span>
            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />
            <span className="flex-1 text-white text-sm">{team.name}</span>
            <button onClick={() => dispatch({ type: 'REMOVE_TEAM', payload: team.id })}
              className="text-gray-500 hover:text-red-400 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {state.teams.length === 0 && (
          <div className="text-center text-gray-500 py-8 text-sm">Nessuna squadra aggiunta</div>
        )}
      </div>

      <div className="flex gap-3 pt-1">
        <button onClick={onBack}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
        >
          <ChevronLeft size={18} /> Indietro
        </button>
        <button onClick={onNext} disabled={state.teams.length < 2}
          className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
        >
          Avanti ({state.teams.length}) <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}

// ─── Step 3: Vincoli ─────────────────────────────────────────────────────────

function Step3({ onNext, onBack }) {
  const { state, dispatch } = useTournament()
  const { constraints } = state

  const upd = (key, val) => dispatch({ type: 'UPDATE_CONSTRAINTS', payload: { [key]: val } })

  return (
    <div className="space-y-5">
      <ToggleRow
        label="Una squadra può giocare 2 volte nello stesso giorno?"
        value={constraints.allowDoubleDay}
        onChange={() => upd('allowDoubleDay', !constraints.allowDoubleDay)}
      />

      <SliderRow
        label="Partite massime totali al giorno"
        value={constraints.maxMatchesPerDay}
        min={1} max={20}
        onChange={v => upd('maxMatchesPerDay', v)}
      />

      <RestMinutesRow
        value={constraints.minRestMinutes}
        onChange={v => upd('minRestMinutes', v)}
      />

      <div className="flex gap-3 pt-1">
        <button onClick={onBack}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
        >
          <ChevronLeft size={18} /> Indietro
        </button>
        <button onClick={onNext}
          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
        >
          Avanti <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}

function RestMinutesRow({ value, onChange }) {
  const presets = [0, 15, 30, 45, 60, 90, 120]
  return (
    <div className="bg-gray-800 rounded-xl px-4 py-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-200">Riposo minimo tra partite (stessa squadra)</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0} max={300} step={5}
            className="w-16 bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-white text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={value}
            onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))}
          />
          <span className="text-gray-400 text-sm">min</span>
        </div>
      </div>
      <input
        type="range" min={0} max={180} step={15}
        className="w-full accent-blue-500"
        value={value}
        onChange={e => onChange(parseInt(e.target.value))}
      />
      <div className="flex gap-1 flex-wrap">
        {presets.map(p => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`px-2 py-0.5 rounded text-xs transition-all ${
              value === p ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {p === 0 ? 'Nessuno' : `${p}min`}
          </button>
        ))}
      </div>
    </div>
  )
}

function ToggleRow({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
      <span className="text-gray-200 text-sm pr-4">{label}</span>
      <button onClick={onChange}
        className={`relative w-12 h-6 rounded-full transition-all flex-shrink-0 ${value ? 'bg-blue-500' : 'bg-gray-600'}`}
      >
        <span className="absolute top-1 w-4 h-4 bg-white rounded-full transition-all"
          style={{ left: value ? '26px' : '4px' }} />
      </button>
    </div>
  )
}

function SliderRow({ label, value, min, max, onChange, suffix }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-300">{label}</label>
        <span className="text-blue-400 font-bold text-sm">{suffix || value}</span>
      </div>
      <input type="range" min={min} max={max}
        className="w-full accent-blue-500"
        value={value}
        onChange={e => onChange(parseInt(e.target.value))}
      />
      <div className="flex justify-between text-xs text-gray-500 mt-0.5">
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  )
}

// ─── Step titles ─────────────────────────────────────────────────────────────

const STEP_LABELS = ['Info', 'Squadre', 'Regole', 'Formato']
const STEP_ICONS = [Trophy, Users, Settings, Wand2]

// ─── Main wizard ─────────────────────────────────────────────────────────────

export default function SetupWizard() {
  const [step, setStep] = useState(0)
  const { state, dispatch } = useTournament()

  const hasExistingData = state.matches.length > 0
  const hasSchedule = Object.keys(state.schedule).length > 0

  const backToBuilder = () => dispatch({ type: 'SET_STEP', payload: 'build' })

  const goToBuild = (parsedMatches) => {
    if (hasSchedule && !confirm('Rigenerare le partite azzererà il calendario già pianificato. Continuare?')) return
    dispatch({ type: 'SET_MATCHES_FROM_TEXT', payload: parsedMatches })
    setTimeout(() => dispatch({ type: 'SET_STEP', payload: 'build' }), 50)
  }

  const Icon = STEP_ICONS[step]

  return (
    <div className="min-h-screen flex items-start sm:items-center justify-center p-4 pt-6">
      <div className="w-full max-w-lg">
        {hasExistingData && (
          <div className="flex justify-center mb-4">
            <button
              onClick={backToBuilder}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition-all"
            >
              <ChevronLeft size={15} /> Torna al calendario
            </button>
          </div>
        )}

        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center">
              <Icon size={20} className="text-blue-400" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Tournament Architect</h1>
          <p className="text-gray-400 mt-1">{STEP_LABELS[step]}</p>
        </div>

        <StepIndicator current={step} total={STEP_LABELS.length} />

        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 sm:p-6">
          {step === 0 && <Step1 onNext={() => setStep(1)} />}
          {step === 1 && <Step2 onNext={() => setStep(2)} onBack={() => setStep(0)} />}
          {step === 2 && <Step3 onNext={() => setStep(3)} onBack={() => setStep(1)} />}
          {step === 3 && <FormatTextEditor onBack={() => setStep(2)} onGenerate={goToBuild} />}
        </div>
      </div>
    </div>
  )
}
