import { useState, useMemo } from 'react'
import { useTournament, generateId } from '../store/tournamentStore'
import { parsePlaceholderRef, isValidPlaceholder, placeholderLabel } from '../utils/placeholders'
import {
  ChevronLeft, Wand2, FileText, AlertTriangle,
  CheckCircle, Copy, Layers, Trophy, GitBranch,
  Tag, ArrowRight
} from 'lucide-react'

// ─── Parser ──────────────────────────────────────────────────────────────────

export function parseFormatText(rawText, teams) {
  const teamByName = {}
  teams.forEach(t => {
    teamByName[t.name.toLowerCase().trim()] = t
  })

  function lookupTeam(name) {
    const key = name.toLowerCase().trim()
    if (teamByName[key]) return teamByName[key]
    // Partial prefix match
    const entry = Object.entries(teamByName).find(([k]) =>
      k.startsWith(key) || key.startsWith(k)
    )
    return entry ? entry[1] : null
  }

  const lines   = rawText.split('\n')
  const matches = []
  const errors  = []
  const warnings = []
  let section = 'Partite'
  let secCount = 0  // match counter within current section

  for (let i = 0; i < lines.length; i++) {
    const raw  = lines[i]
    const line = raw.trim()
    const ln   = i + 1

    if (!line || line.startsWith('#')) continue

    // ── Section header ──
    if (line.startsWith('[') && line.includes(']')) {
      section  = line.slice(1, line.lastIndexOf(']')).trim() || section
      secCount = 0
      continue
    }

    // ── Match line: "A vs B" ──
    const vsIdx = line.search(/\bvs\b/i)
    if (vsIdx !== -1) {
      const rawLeft  = line.slice(0, vsIdx).trim()
      const rawRight = line.slice(vsIdx + 2).trim()

      const t1  = lookupTeam(rawLeft)
      const t2  = lookupTeam(rawRight)
      const ph1 = parsePlaceholderRef(rawLeft)
      const ph2 = parsePlaceholderRef(rawRight)

      // Only warn if neither a known team nor a valid placeholder
      if (!t1 && !ph1) {
        warnings.push({ line: ln, msg: `"${rawLeft}" non è una squadra né un segnaposto valido` })
      }
      if (!t2 && !ph2) {
        warnings.push({ line: ln, msg: `"${rawRight}" non è una squadra né un segnaposto valido` })
      }

      secCount++
      const prefix = section.replace(/\s+/g, '').slice(0, 3).toUpperCase()
      const label  = `${prefix}${secCount}`
      const isKnockout = (!t1 && ph1 && ph1.type !== 'tbd') || (!t2 && ph2 && ph2.type !== 'tbd') || (!t1 && !t2)

      matches.push({
        id:              generateId(),
        team1Id:         t1?.id   || null,
        team2Id:         t2?.id   || null,
        ref1:            t1       ? null : ph1,
        ref2:            t2       ? null : ph2,
        placeholder1:    t1       ? null : rawLeft,
        placeholder2:    t2       ? null : rawRight,
        resolvedTeam1Id: null,
        resolvedTeam2Id: null,
        result:          null,
        label,
        round:           section,
        phase:           isKnockout ? 'knockout' : 'group',
        bracket:         isKnockout ? 'knockout'  : null,
      })
      continue
    }

    // ── Team list → round-robin ──
    if (line.includes(',')) {
      const parts   = line.split(',').map(p => p.trim()).filter(Boolean)
      if (parts.length < 2) continue

      const found   = []
      const missing = []
      parts.forEach(name => {
        const t = lookupTeam(name)
        if (t) found.push(t)
        else if (!isValidPlaceholder(name)) missing.push(name)
        // valid placeholders in a list are silently skipped
      })
      if (missing.length > 0) {
        errors.push({ line: ln, msg: `Squadre non trovate: ${missing.join(', ')}` })
      }
      if (found.length >= 2) {
        for (let a = 0; a < found.length; a++) {
          for (let b = a + 1; b < found.length; b++) {
            secCount++
            const prefix = section.replace(/\s+/g, '').slice(0, 2).toUpperCase()
            matches.push({
              id:              generateId(),
              team1Id:         found[a].id,
              team2Id:         found[b].id,
              ref1:            null,
              ref2:            null,
              placeholder1:    null,
              placeholder2:    null,
              resolvedTeam1Id: null,
              resolvedTeam2Id: null,
              result:          null,
              label:           `${prefix}${secCount}`,
              round:           section,
              phase:           'group',
              bracket:         null,
            })
          }
        }
      }
      continue
    }

    if (line.length > 1) {
      warnings.push({ line: ln, msg: `Riga non riconosciuta: "${line}"` })
    }
  }

  return { matches, errors, warnings }
}

// ─── Templates ───────────────────────────────────────────────────────────────

function buildTemplate(type, teams) {
  const names = teams.map(t => t.name)
  const n = names.length

  if (type === 'roundrobin') {
    return `# Girone unico — tutti contro tutti\n[Girone]\n${names.join(', ')}\n`
  }
  if (type === 'groups2') {
    const half = Math.ceil(n / 2)
    const gA = names.slice(0, half).join(', ')
    const gB = names.slice(half).join(', ')
    return `[Girone A]\n${gA}\n\n[Girone B]\n${gB}\n\n[Semifinali]\n1A vs 2B\n1B vs 2A\n\n[Finale]\nVin. SEM1 vs Vin. SEM2\n\n[3° Posto]\nPerd. SEM1 vs Perd. SEM2\n`
  }
  if (type === 'knockout') {
    const lines = []
    for (let i = 0; i < Math.floor(n / 2); i++) {
      lines.push(`${names[i * 2] || 'TBD'} vs ${names[i * 2 + 1] || 'TBD'}`)
    }
    return `[Ottavi di Finale]\n${lines.join('\n')}\n\n[Quarti di Finale]\nVin. OTT1 vs Vin. OTT2\nVin. OTT3 vs Vin. OTT4\n\n[Semifinali]\nVin. QUA1 vs Vin. QUA2\nVin. QUA3 vs Vin. QUA4\n\n[Finale]\nVin. SEM1 vs Vin. SEM2\n\n[3° Posto]\nPerd. SEM1 vs Perd. SEM2\n`
  }
  if (type === 'custom') {
    const half = Math.ceil(n / 2)
    return `# Formato personalizzato
# Sintassi:
#   [Nome Sezione]        → nuova fase (il nome diventa prefisso delle etichette)
#   A, B, C, D           → girone round-robin
#   Team1 vs Team2        → partita singola con squadre reali
#   1A vs 2B              → 1° Girone A vs 2° Girone B (segnaposto classifica)
#   Vin. SEM1 vs Vin. SEM2 → vincente della partita SEM1/SEM2
#   Perd. SEM1 vs Perd. SEM2 → perdente
#   TBD vs TBD            → segnaposto generico

[Girone A]
${names.slice(0, half).join(', ')}

[Girone B]
${names.slice(half).join(', ')}

[Semifinali]
1A vs 2B
1B vs 2A

[Finale]
Vin. SEM1 vs Vin. SEM2

[3° Posto]
Perd. SEM1 vs Perd. SEM2
`
  }
  return ''
}

// ─── Preview panel ───────────────────────────────────────────────────────────

function RefBadge({ ref: r, rawText }) {
  if (!r) return <span className="text-gray-200 truncate">{rawText}</span>
  if (r.type === 'group_rank')
    return <span className="inline-flex items-center gap-1 text-amber-300 font-mono text-[10px] bg-amber-950/40 border border-amber-800/40 rounded px-1">{placeholderLabel(r)}</span>
  if (r.type === 'match_winner')
    return <span className="inline-flex items-center gap-1 text-emerald-300 font-mono text-[10px] bg-emerald-950/40 border border-emerald-800/40 rounded px-1"><ArrowRight size={8} />{placeholderLabel(r)}</span>
  if (r.type === 'match_loser')
    return <span className="inline-flex items-center gap-1 text-red-300 font-mono text-[10px] bg-red-950/40 border border-red-800/40 rounded px-1">{placeholderLabel(r)}</span>
  return <span className="text-gray-400 italic text-[10px]">{placeholderLabel(r)}</span>
}

function MatchPreview({ matches, teams, errors, warnings }) {
  const teamMap = Object.fromEntries(teams.map(t => [t.id, t]))
  const byRound = {}
  matches.forEach(m => {
    if (!byRound[m.round]) byRound[m.round] = []
    byRound[m.round].push(m)
  })

  return (
    <div className="space-y-3">
      {errors.map((e, i) => (
        <div key={i} className="flex gap-2 text-xs bg-red-950/50 border border-red-800/50 rounded-lg px-2 py-1.5 text-red-300">
          <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />
          <span><b>L.{e.line}:</b> {e.msg}</span>
        </div>
      ))}
      {warnings.map((w, i) => (
        <div key={i} className="flex gap-2 text-xs bg-amber-950/40 border border-amber-800/40 rounded-lg px-2 py-1.5 text-amber-300">
          <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />
          <span><b>L.{w.line}:</b> {w.msg}</span>
        </div>
      ))}

      {Object.entries(byRound).map(([round, ms]) => (
        <div key={round}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 flex justify-between">
            <span>{round}</span>
            <span className="text-gray-600">{ms.length}p</span>
          </div>
          <div className="space-y-1">
            {ms.map(m => {
              const t1 = teamMap[m.team1Id]
              const t2 = teamMap[m.team2Id]
              return (
                <div key={m.id} className={`text-xs rounded-lg px-2 py-1.5 flex items-center gap-2 ${
                  m.bracket === 'knockout'
                    ? 'bg-purple-950/40 border border-purple-800/40'
                    : 'bg-blue-950/30 border border-blue-800/30'
                }`}>
                  <span className="text-gray-500 font-mono text-[10px] flex-shrink-0 w-10">{m.label}</span>
                  <div className="flex-1 flex items-center gap-1 min-w-0 overflow-hidden">
                    {t1 && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: t1.color }} />}
                    {t1
                      ? <span className="text-gray-200 truncate">{t1.name}</span>
                      : <RefBadge ref={m.ref1} rawText={m.placeholder1} />
                    }
                    <span className="text-gray-600 flex-shrink-0 mx-0.5">vs</span>
                    {t2 && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: t2.color }} />}
                    {t2
                      ? <span className="text-gray-200 truncate">{t2.name}</span>
                      : <RefBadge ref={m.ref2} rawText={m.placeholder2} />
                    }
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {matches.length > 0 && (
        <div className="border-t border-gray-700 pt-2 flex justify-between">
          <span className="text-xs text-gray-400">Totale</span>
          <span className="text-sm font-bold text-emerald-400">{matches.length} partite</span>
        </div>
      )}
      {matches.length === 0 && errors.length === 0 && (
        <div className="text-center text-gray-600 text-sm py-4">Scrivi il formato per vedere l'anteprima</div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const TEMPLATES = [
  { id: 'custom',     icon: FileText,  label: 'Guida + esempio' },
  { id: 'roundrobin', icon: Layers,    label: 'Girone unico' },
  { id: 'groups2',    icon: GitBranch, label: '2 Gironi + finale' },
  { id: 'knockout',   icon: Trophy,    label: 'Eliminazione' },
]

export default function FormatTextEditor({ onBack, onGenerate }) {
  const { state } = useTournament()
  const { teams } = state
  const [text, setText] = useState(() => buildTemplate('custom', teams))
  const [copied, setCopied] = useState(false)

  const { matches, errors, warnings } = useMemo(() => parseFormatText(text, teams), [text, teams])
  const canGenerate = matches.length > 0 && errors.length === 0

  const copyTeams = () => {
    navigator.clipboard.writeText(teams.map(t => t.name).join(', '))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="space-y-4">
      {/* Template buttons */}
      <div>
        <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider font-semibold">Carica modello</div>
        <div className="flex gap-2 flex-wrap">
          {TEMPLATES.map(t => {
            const Icon = t.icon
            return (
              <button key={t.id} onClick={() => setText(buildTemplate(t.id, teams))}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs text-gray-200 transition-all"
              >
                <Icon size={11} />{t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Editor + preview */}
      <div className="flex gap-3">
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Editor formato</span>
            <button onClick={copyTeams}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-200 transition-all"
            >
              <Copy size={10} />{copied ? 'Copiato!' : 'Copia nomi squadre'}
            </button>
          </div>
          <textarea
            className="w-full h-72 bg-gray-800 border border-gray-600 rounded-xl px-3 py-3 text-sm font-mono text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed"
            value={text}
            onChange={e => setText(e.target.value)}
            spellCheck={false}
          />
          <div className="bg-gray-800/60 rounded-lg px-3 py-2 text-[11px] text-gray-500 grid grid-cols-2 gap-x-4 gap-y-0.5">
            <div><span className="text-blue-400 font-mono">[Nome]</span> → nuova sezione</div>
            <div><span className="text-purple-400 font-mono">1A vs 2B</span> → classifica girone</div>
            <div><span className="text-emerald-400 font-mono">A, B, C</span> → girone round-robin</div>
            <div><span className="text-emerald-400 font-mono">Vin. SEM1</span> → vincente partita</div>
            <div><span className="text-amber-400 font-mono">A vs B</span> → partita singola</div>
            <div><span className="text-red-400 font-mono">Perd. SEM1</span> → perdente partita</div>
          </div>
        </div>

        <div className="w-60 flex-shrink-0">
          <div className="text-xs text-gray-400 mb-1.5 flex items-center gap-1">
            {canGenerate
              ? <CheckCircle size={11} className="text-emerald-400" />
              : errors.length > 0
                ? <AlertTriangle size={11} className="text-red-400" />
                : <Tag size={11} />
            }
            Anteprima live
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3 h-72 overflow-y-auto">
            <MatchPreview matches={matches} teams={teams} errors={errors} warnings={warnings} />
          </div>
        </div>
      </div>

      {/* Legend for placeholder badges */}
      <div className="flex gap-3 text-[11px] text-gray-500">
        <span className="flex items-center gap-1"><span className="bg-amber-950/40 border border-amber-800/40 text-amber-300 rounded px-1 font-mono">1°A</span> classifica girone</span>
        <span className="flex items-center gap-1"><span className="bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 rounded px-1 font-mono">Vin.</span> vincente</span>
        <span className="flex items-center gap-1"><span className="bg-red-950/40 border border-red-800/40 text-red-300 rounded px-1 font-mono">Perd.</span> perdente</span>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-sm"
        >
          <ChevronLeft size={16} /> Indietro
        </button>
        <button
          onClick={() => canGenerate && onGenerate(matches)}
          disabled={!canGenerate}
          className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-sm"
        >
          <Wand2 size={16} />
          {canGenerate ? `Genera (${matches.length} partite)` : errors.length > 0 ? 'Correggi gli errori' : 'Scrivi il formato'}
        </button>
      </div>
    </div>
  )
}
