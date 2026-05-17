import { useState, useRef, useEffect } from 'react'
import { useTournament, generateMatchesFromFormat } from '../store/tournamentStore'
import {
  Send, Bot, User, ChevronLeft, Wand2,
  RefreshCw, Star, Trophy, GitBranch, Layers, RotateCcw
} from 'lucide-react'

// ─── Rule-based parser ────────────────────────────────────────────────────────

function parseFormatFromText(text, numTeams) {
  const t = text.toLowerCase()

  const result = {
    type: 'groups_knockout',
    numGroups: 2,
    advancePerGroup: 2,
    hasThirdPlace: false,
    seeded: false,
    swissRounds: 5,
  }

  const detections = []

  // Format type detection
  if (/doppia.elimin|double.elimin|loser.bracket|losers.bracket/.test(t)) {
    result.type = 'double_elimination'
    detections.push({ label: 'Doppia Eliminazione', icon: 'refresh' })
  } else if (/svizzer|swiss|turni.fissi|round.fissi/.test(t)) {
    result.type = 'swiss'
    detections.push({ label: 'Sistema Svizzero', icon: 'star' })
  } else if (/(eliminazione.diretta|knockout|tabellone.singolo|singola.elimin)/.test(t) && !/giron|grup/.test(t)) {
    result.type = 'knockout'
    detections.push({ label: 'Eliminazione Diretta', icon: 'trophy' })
  } else if (/tutti.contro.tutti|girone.unico|round.robin/.test(t)) {
    result.type = 'roundrobin'
    detections.push({ label: 'Girone Unico', icon: 'layers' })
  } else if (/giron|grup/.test(t)) {
    result.type = /final|playoff|semifinal|qualific|elimin/.test(t) ? 'groups_knockout' : 'groups'
    detections.push({ label: result.type === 'groups_knockout' ? 'Gironi + Finale' : 'Solo Gironi', icon: 'branch' })
  }

  // Number of groups
  const groupsMatch = t.match(/(\d+)\s*giron/)
  if (groupsMatch) {
    result.numGroups = Math.min(8, Math.max(2, parseInt(groupsMatch[1])))
    detections.push({ label: `${result.numGroups} gironi` })
  }

  // Teams per group → infer numGroups
  const tpgMatch = t.match(/(\d+)\s*squadr[ae]\s*(?:per|a|in ogni|in ciascun)\s*giron/)
  if (tpgMatch && numTeams > 0) {
    const tpg = parseInt(tpgMatch[1])
    result.numGroups = Math.min(8, Math.max(2, Math.round(numTeams / tpg)))
    detections.push({ label: `~${tpg} sq/girone → ${result.numGroups} gironi` })
  }

  // Advancing teams per group
  const advMatch = t.match(/(?:prim[eo]|top|migliori?|le prime)\s*(\d+)/)
  if (advMatch) {
    result.advancePerGroup = Math.min(6, Math.max(1, parseInt(advMatch[1])))
    detections.push({ label: `Top ${result.advancePerGroup} per girone si qualifica` })
  }

  // Third place
  if (/terz[ao].posto|3[°o].posto|finale.per.il.terzo|partita.terzo/.test(t)) {
    result.hasThirdPlace = true
    detections.push({ label: 'Partita 3° posto' })
  } else if (/senza.terzo|no.terzo|niente.terzo/.test(t)) {
    result.hasThirdPlace = false
  }

  // Seeded / testa di serie
  if (/seed|testa.di.serie|test[ae]/.test(t)) {
    result.seeded = true
    detections.push({ label: 'Con testa di serie' })
  }

  // Swiss rounds
  const roundsMatch = t.match(/(\d+)\s*(?:turni|round|giornate|giornata)/)
  if (roundsMatch) {
    result.swissRounds = Math.min(12, Math.max(3, parseInt(roundsMatch[1])))
    if (result.type === 'swiss') detections.push({ label: `${result.swissRounds} turni` })
  }

  // Fallback detection label if nothing matched
  if (detections.length === 0) {
    detections.push({ label: '?' })
  }

  return { format: result, detections }
}

// ─── Suggestions (example chips) ─────────────────────────────────────────────

const SUGGESTIONS = [
  '2 gironi da 4 squadre, le prime 2 vanno ai quarti',
  '3 gironi, top 2 per girone + finale',
  'eliminazione diretta con terzo posto',
  'doppia eliminazione',
  'sistema svizzero con 5 turni',
  '4 gironi, solo girone, nessuna fase finale',
]

// ─── Detection pill icons ─────────────────────────────────────────────────────

const FORMAT_ICONS = {
  refresh: RefreshCw,
  star: Star,
  trophy: Trophy,
  branch: GitBranch,
  layers: Layers,
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end gap-2">
        <div className="max-w-[85%] bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm">
          {msg.text}
        </div>
        <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
          <User size={13} className="text-white" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <div className="w-7 h-7 rounded-full bg-purple-700 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bot size={13} className="text-white" />
      </div>
      <div className="max-w-[90%] space-y-2">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-gray-200">
          {msg.text}
        </div>

        {/* Detected format summary */}
        {msg.detections && msg.detections.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {msg.detections.map((d, i) => {
              const Icon = d.icon ? FORMAT_ICONS[d.icon] : null
              return (
                <span key={i} className="flex items-center gap-1 bg-purple-900/40 border border-purple-700/40 text-purple-200 text-[11px] px-2 py-0.5 rounded-full">
                  {Icon && <Icon size={10} />}
                  {d.label}
                </span>
              )
            })}
          </div>
        )}

        {/* Format preview card */}
        {msg.formatPreview && (
          <FormatPreviewCard format={msg.formatPreview} numTeams={msg.numTeams} />
        )}
      </div>
    </div>
  )
}

// ─── Format preview card inside chat ─────────────────────────────────────────

const FORMAT_LABELS = {
  groups_knockout: 'Gironi + Finale',
  roundrobin: 'Girone Unico',
  groups: 'Solo Gironi',
  knockout: 'Eliminazione Diretta',
  double_elimination: 'Doppia Eliminazione',
  swiss: 'Sistema Svizzero',
}

function FormatPreviewCard({ format, numTeams }) {
  let matchCount = 0
  try {
    const fakeTeams = Array.from({ length: numTeams }, (_, i) => ({ id: `t${i}`, name: `T${i}` }))
    matchCount = generateMatchesFromFormat(fakeTeams, format).length
  } catch { /* ignore */ }

  const rows = []
  const n = numTeams

  if (format.type === 'roundrobin') {
    rows.push({ label: 'Partite', value: n * (n - 1) / 2 })
  } else if (format.type === 'groups_knockout' || format.type === 'groups') {
    rows.push({ label: 'Gironi', value: format.numGroups })
    if (format.type === 'groups_knockout') rows.push({ label: 'Qualificati per girone', value: format.advancePerGroup })
    if (format.hasThirdPlace) rows.push({ label: 'Partita 3° posto', value: '✓' })
  } else if (format.type === 'knockout') {
    rows.push({ label: 'Formato', value: 'Eliminazione diretta' })
    if (format.hasThirdPlace) rows.push({ label: 'Partita 3° posto', value: '✓' })
    if (format.seeded) rows.push({ label: 'Seed', value: '✓' })
  } else if (format.type === 'double_elimination') {
    rows.push({ label: 'WB matches', value: `~${Math.max(0, n - 1)}` })
    rows.push({ label: 'LB matches', value: `~${Math.max(0, n - 2)}` })
    rows.push({ label: 'Grande Finale', value: '1' })
  } else if (format.type === 'swiss') {
    rows.push({ label: 'Turni', value: format.swissRounds })
    rows.push({ label: 'Partite/turno', value: Math.floor(n / 2) })
  }

  return (
    <div className="bg-gray-900 border border-purple-700/30 rounded-xl overflow-hidden text-xs">
      <div className="px-3 py-1.5 bg-purple-900/30 text-purple-300 font-semibold">
        {FORMAT_LABELS[format.type] || format.type}
        {matchCount > 0 && <span className="ml-2 text-purple-400 font-normal">· {matchCount} partite</span>}
      </div>
      <div className="px-3 py-2 space-y-1">
        {rows.map((r, i) => (
          <div key={i} className="flex justify-between">
            <span className="text-gray-400">{r.label}</span>
            <span className="text-white font-medium">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main chatbot component ───────────────────────────────────────────────────

export default function FormatChatbot({ onBack, onGenerate }) {
  const { state } = useTournament()
  const n = state.teams.length

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'bot',
      text: `Ciao! Dimmi come vuoi strutturare il torneo con ${n} squadre e genererò il formato. Puoi scrivere liberamente, ad esempio: "3 gironi, le prime 2 vanno in semifinale, con partita per il terzo posto".`,
    }
  ])
  const [input, setInput] = useState('')
  const [lastFormat, setLastFormat] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = (text) => {
    const trimmed = (text || input).trim()
    if (!trimmed) return

    const userMsg = { id: Date.now() + 'u', role: 'user', text: trimmed }
    const { format, detections } = parseFormatFromText(trimmed, n)

    let botText = ''
    if (detections.some(d => d.label === '?')) {
      botText = "Non ho capito bene. Prova con frasi come: "
        + '"3 gironi, top 2 per girone" oppure "doppia eliminazione" oppure "sistema svizzero con 5 turni".'
    } else {
      const names = detections.map(d => d.label)
      botText = `Ho capito: ${names.join(', ')}. Ecco l'anteprima del formato.`
    }

    const botMsg = {
      id: Date.now() + 'b',
      role: 'bot',
      text: botText,
      detections,
      formatPreview: format,
      numTeams: n,
    }

    setMessages(prev => [...prev, userMsg, botMsg])
    setLastFormat(format)
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const reset = () => {
    setMessages([{
      id: 'reset',
      role: 'bot',
      text: `Ricominciamo! Dimmi come vuoi il torneo con ${n} squadre.`,
    }])
    setLastFormat(null)
    setInput('')
  }

  return (
    <div className="flex flex-col h-full min-h-0" style={{ minHeight: '420px' }}>
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-3 pr-1">
        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggestion chips */}
      {messages.length <= 2 && (
        <div className="flex flex-wrap gap-1.5 py-2">
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              onClick={() => send(s)}
              className="text-[11px] bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-2.5 py-1 rounded-full transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex gap-2 pt-2 border-t border-gray-700">
        <input
          className="flex-1 bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-500"
          placeholder="Descrivi il formato del torneo..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim()}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white p-2.5 rounded-xl transition-all"
        >
          <Send size={16} />
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 pt-3">
        <button
          onClick={onBack}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-all"
        >
          <ChevronLeft size={16} /> Indietro
        </button>
        {lastFormat && messages.length > 1 && (
          <button
            onClick={reset}
            className="bg-gray-700 hover:bg-gray-600 text-gray-300 py-2.5 px-3 rounded-xl transition-all"
            title="Ricomincia"
          >
            <RotateCcw size={15} />
          </button>
        )}
        <button
          onClick={() => onGenerate(lastFormat)}
          disabled={!lastFormat}
          className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-all"
        >
          <Wand2 size={16} /> Genera formato
        </button>
      </div>
    </div>
  )
}
