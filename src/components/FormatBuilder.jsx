import { useState, useMemo } from 'react'
import { useTournament } from '../store/tournamentStore'
import { generateMatchesFromFormat } from '../store/tournamentStore'
import {
  Trophy, Layers, GitBranch, ChevronLeft, Wand2,
  Users, Hash, Medal, ArrowRight
} from 'lucide-react'

const FORMAT_TYPES = [
  {
    id: 'roundrobin',
    icon: Layers,
    label: 'Girone Unico',
    desc: 'Tutti contro tutti in un unico girone',
    color: 'blue',
  },
  {
    id: 'groups_knockout',
    icon: GitBranch,
    label: 'Gironi + Finale',
    desc: 'Fase a gironi seguita da eliminazione diretta',
    color: 'purple',
  },
  {
    id: 'groups',
    icon: Layers,
    label: 'Solo Gironi',
    desc: 'Più gironi paralleli, nessuna fase finale',
    color: 'emerald',
  },
  {
    id: 'knockout',
    icon: Trophy,
    label: 'Eliminazione Diretta',
    desc: 'Tabellone a eliminazione, partite da definire in anticipo',
    color: 'amber',
  },
]

const COLOR_MAP = {
  blue: 'border-blue-500 bg-blue-950/40',
  purple: 'border-purple-500 bg-purple-950/40',
  emerald: 'border-emerald-500 bg-emerald-950/40',
  amber: 'border-amber-500 bg-amber-950/40',
}

function countMatchesPreview(teams, format) {
  try {
    return generateMatchesFromFormat(teams, format).length
  } catch {
    return 0
  }
}

function groupSize(teams, numGroups) {
  const base = Math.floor(teams.length / numGroups)
  const extra = teams.length % numGroups
  if (extra === 0) return `${base}`
  return `${base}–${base + 1}`
}

function nextPow2(n) { let p = 1; while (p < n) p *= 2; return p }

export default function FormatBuilder({ onBack, onGenerate }) {
  const { state } = useTournament()
  const { teams, format: savedFormat } = state
  const n = teams.length

  const [format, setFormat] = useState(savedFormat)
  const upd = (key, val) => setFormat(f => ({ ...f, [key]: val }))

  const matchCount = useMemo(() => countMatchesPreview(teams, format), [teams, format])
  const selectedDef = FORMAT_TYPES.find(f => f.id === format.type) || FORMAT_TYPES[0]

  // Computed constraints
  const maxGroups = Math.min(Math.floor(n / 2), 8)
  const teamsPerGroupStr = n > 0 ? groupSize(teams, format.numGroups) : '—'
  const advancingTotal = format.numGroups * format.advancePerGroup
  const bracketSize = nextPow2(advancingTotal)
  const maxAdvance = n > 0 ? Math.max(1, Math.floor(n / format.numGroups) - 1) : 1

  return (
    <div className="space-y-5">
      {/* Format type selector */}
      <div className="grid grid-cols-2 gap-2">
        {FORMAT_TYPES.map(f => {
          const Icon = f.icon
          const active = format.type === f.id
          return (
            <button
              key={f.id}
              onClick={() => upd('type', f.id)}
              className={`
                text-left p-3 rounded-xl border-2 transition-all
                ${active ? COLOR_MAP[f.color] : 'border-gray-700 bg-gray-800 hover:border-gray-500'}
              `}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon size={14} className={active ? `text-${f.color}-400` : 'text-gray-400'} />
                <span className={`text-sm font-semibold ${active ? 'text-white' : 'text-gray-300'}`}>{f.label}</span>
              </div>
              <p className="text-xs text-gray-400 leading-tight">{f.desc}</p>
            </button>
          )
        })}
      </div>

      {/* ── Round Robin: no options ── */}
      {format.type === 'roundrobin' && (
        <InfoBox icon={Layers} text={`Con ${n} squadre: ${n * (n-1) / 2} partite totali`} />
      )}

      {/* ── Groups options ── */}
      {(format.type === 'groups' || format.type === 'groups_knockout') && (
        <div className="space-y-4 bg-gray-800/50 rounded-xl p-4">
          <SliderRow
            icon={Hash}
            label="Numero di gironi"
            value={format.numGroups}
            min={2} max={Math.max(2, maxGroups)}
            onChange={v => {
              const ng = Math.min(v, maxGroups)
              const maxAdv = Math.max(1, Math.floor(n / ng) - 1)
              upd('numGroups', ng)
              if (format.advancePerGroup > maxAdv) upd('advancePerGroup', maxAdv)
            }}
            badge={`${teamsPerGroupStr} sq/girone`}
          />

          {format.type === 'groups_knockout' && (
            <SliderRow
              icon={ArrowRight}
              label="Squadre qualificate per girone"
              value={format.advancePerGroup}
              min={1} max={Math.max(1, maxAdvance)}
              onChange={v => upd('advancePerGroup', Math.min(v, maxAdvance))}
              badge={`${advancingTotal} totali → bracket ${bracketSize}`}
            />
          )}
        </div>
      )}

      {/* ── Groups + knockout extra options ── */}
      {format.type === 'groups_knockout' && (
        <div className="space-y-2">
          <ToggleRow
            label="Partita per il 3° posto"
            value={format.hasThirdPlace}
            onChange={() => upd('hasThirdPlace', !format.hasThirdPlace)}
          />
        </div>
      )}

      {/* ── Knockout options ── */}
      {format.type === 'knockout' && (
        <div className="space-y-2 bg-gray-800/50 rounded-xl p-4">
          <ToggleRow
            label="Sorteggio con testa di serie (seed)"
            value={format.seeded}
            onChange={() => upd('seeded', !format.seeded)}
          />
          <ToggleRow
            label="Partita per il 3° posto"
            value={format.hasThirdPlace}
            onChange={() => upd('hasThirdPlace', !format.hasThirdPlace)}
          />
        </div>
      )}

      {/* Preview */}
      <MatchPreview teams={teams} format={format} matchCount={matchCount} />

      {/* Buttons */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={onBack}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
        >
          <ChevronLeft size={18} /> Indietro
        </button>
        <button
          onClick={() => onGenerate(format)}
          disabled={n < 2 || matchCount === 0}
          className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
        >
          <Wand2 size={18} /> Genera {matchCount > 0 ? `(${matchCount} partite)` : ''}
        </button>
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SliderRow({ icon: Icon, label, value, min, max, onChange, badge }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="flex items-center gap-1.5 text-sm text-gray-300">
          <Icon size={13} className="text-gray-400" />
          {label}
        </label>
        <div className="flex items-center gap-2">
          {badge && <span className="text-xs text-blue-400 bg-blue-950/50 px-2 py-0.5 rounded-full">{badge}</span>}
          <span className="font-bold text-white w-5 text-right">{value}</span>
        </div>
      </div>
      <input
        type="range" min={min} max={max}
        className="w-full accent-blue-500"
        value={value}
        onChange={e => onChange(parseInt(e.target.value))}
      />
    </div>
  )
}

function ToggleRow({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-gray-300">{label}</span>
      <button
        onClick={onChange}
        className={`relative w-10 h-5 rounded-full transition-all flex-shrink-0 ${value ? 'bg-blue-500' : 'bg-gray-600'}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${value ? 'left-5.5' : 'left-0.5'}`}
          style={{ left: value ? '22px' : '2px' }}
        />
      </button>
    </div>
  )
}

function InfoBox({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-2 bg-blue-950/30 border border-blue-800/40 rounded-xl px-4 py-2.5">
      <Icon size={14} className="text-blue-400" />
      <span className="text-sm text-blue-200">{text}</span>
    </div>
  )
}

function MatchPreview({ teams, format, matchCount }) {
  const n = teams.length
  if (n < 2) return null

  const lines = []

  if (format.type === 'roundrobin') {
    lines.push({ label: 'Partite girone', count: n * (n - 1) / 2, color: 'blue' })
  } else if (format.type === 'groups' || format.type === 'groups_knockout') {
    const { numGroups, advancePerGroup, hasThirdPlace } = format
    const base = Math.floor(n / numGroups)
    const extra = n % numGroups
    let groupMatches = 0
    for (let g = 0; g < numGroups; g++) {
      const sz = base + (g < extra ? 1 : 0)
      groupMatches += sz * (sz - 1) / 2
    }
    lines.push({ label: `Partite gironi (${numGroups}×)`, count: groupMatches, color: 'blue' })

    if (format.type === 'groups_knockout') {
      const advancing = numGroups * advancePerGroup
      const bracket = nextPow2(advancing)
      let knockoutMatches = bracket - 1
      if (hasThirdPlace && advancing >= 4) knockoutMatches++
      lines.push({ label: 'Partite fase finale', count: knockoutMatches, color: 'purple' })
    }
  } else if (format.type === 'knockout') {
    lines.push({ label: 'Partite tabellone', count: matchCount - (format.hasThirdPlace && n >= 4 ? 1 : 0), color: 'amber' })
    if (format.hasThirdPlace && n >= 4) lines.push({ label: '3° Posto', count: 1, color: 'orange' })
  }

  const colorMap = {
    blue: 'text-blue-300',
    purple: 'text-purple-300',
    amber: 'text-amber-300',
    orange: 'text-orange-300',
    emerald: 'text-emerald-300',
  }

  return (
    <div className="bg-gray-800/60 rounded-xl p-3 space-y-2">
      <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Anteprima</div>
      {lines.map((l, i) => (
        <div key={i} className="flex items-center justify-between text-sm">
          <span className="text-gray-300">{l.label}</span>
          <span className={`font-bold ${colorMap[l.color]}`}>{l.count}</span>
        </div>
      ))}
      <div className="border-t border-gray-600 pt-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-white">Totale partite</span>
        <span className="text-lg font-bold text-emerald-400">{matchCount}</span>
      </div>
    </div>
  )
}
