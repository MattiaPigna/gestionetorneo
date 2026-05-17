import { useState, useRef, useEffect } from 'react'
import { useTournament, generateMatchesFromFormat } from '../store/tournamentStore'
import { parseFormatAI } from '../api'
import {
  Send, Bot, User, ChevronLeft, Wand2,
  RefreshCw, Star, Trophy, GitBranch, Layers, RotateCcw, Loader2
} from 'lucide-react'

// ─── Local fallback parser ────────────────────────────────────────────────────

function parseFormatLocal(text, numTeams) {
  const t = text.toLowerCase()
  const result = {
    type: 'groups_knockout', numGroups: 2, advancePerGroup: 2,
    hasThirdPlace: false, seeded: false, swissRounds: 5,
  }

  if (/doppia.elimin|double.elimin|loser.bracket/.test(t)) result.type = 'double_elimination'
  else if (/svizzer|swiss|turni.fissi/.test(t)) result.type = 'swiss'
  else if (/(eliminazione.diretta|knockout|tabellone.singolo)/.test(t) && !/giron/.test(t)) result.type = 'knockout'
  else if (/tutti.contro.tutti|girone.unico|round.robin/.test(t)) result.type = 'roundrobin'
  else if (/giron|grup/.test(t)) result.type = /final|playoff|semifinal|qualific/.test(t) ? 'groups_knockout' : 'groups'

  const gm = t.match(/(\d+)\s*giron/); if (gm) result.numGroups = Math.min(8, Math.max(2, parseInt(gm[1])))
  const tpg = t.match(/(\d+)\s*squadr[ae]\s*(?:per|a|in ogni)\s*giron/)
  if (tpg && numTeams > 0) result.numGroups = Math.min(8, Math.max(2, Math.round(numTeams / parseInt(tpg[1]))))
  const adv = t.match(/(?:prim[eo]|top|migliori?|le prime)\s*(\d+)/); if (adv) result.advancePerGroup = Math.min(6, Math.max(1, parseInt(adv[1])))
  if (/terz[ao].posto|3[°o].posto/.test(t)) result.hasThirdPlace = true
  if (/seed|testa.di.serie/.test(t)) result.seeded = true
  const rm = t.match(/(\d+)\s*(?:turni|round|giornate)/); if (rm) result.swissRounds = Math.min(12, Math.max(3, parseInt(rm[1])))

  return result
}

// ─── Format preview card ──────────────────────────────────────────────────────

const FORMAT_LABELS = {
  groups_knockout: 'Gironi + Finale', roundrobin: 'Girone Unico',
  groups: 'Solo Gironi', knockout: 'Eliminazione Diretta',
  double_elimination: 'Doppia Eliminazione', swiss: 'Sistema Svizzero',
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
    if (format.type === 'groups_knockout') rows.push({ label: 'Qualificati/girone', value: format.advancePerGroup })
    if (format.hasThirdPlace) rows.push({ label: 'Partita 3° posto', value: '✓' })
  } else if (format.type === 'knockout') {
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
      <div className="px-3 py-1.5 bg-purple-900/30 flex items-center justify-between">
        <span className="text-purple-300 font-semibold">{FORMAT_LABELS[format.type] || format.type}</span>
        {matchCount > 0 && <span className="text-purple-400">{matchCount} partite</span>}
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

  if (msg.loading) {
    return (
      <div className="flex gap-2">
        <div className="w-7 h-7 rounded-full bg-purple-700 flex items-center justify-center flex-shrink-0">
          <Bot size={13} className="text-white" />
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
          <Loader2 size={14} className="text-purple-400 animate-spin" />
          <span className="text-sm text-gray-400">Sto interpretando...</span>
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
        <div className={`border rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm ${
          msg.error
            ? 'bg-red-950/30 border-red-800/40 text-red-300'
            : 'bg-gray-800 border-gray-700 text-gray-200'
        }`}>
          {msg.text}
        </div>
        {msg.formatPreview && (
          <FormatPreviewCard format={msg.formatPreview} numTeams={msg.numTeams} />
        )}
      </div>
    </div>
  )
}

// ─── Suggestion chips ─────────────────────────────────────────────────────────

const SUGGESTIONS = [
  '2 gironi da 4 squadre, le prime 2 vanno ai quarti',
  '3 gironi con finale, partita per il terzo posto',
  'eliminazione diretta con terzo posto',
  'doppia eliminazione',
  'sistema svizzero con 5 turni',
  '4 gironi solo girone, nessuna fase finale',
]

// ─── Main chatbot ─────────────────────────────────────────────────────────────

export default function FormatChatbot({ onBack, onGenerate }) {
  const { state } = useTournament()
  const n = state.teams.length

  const [messages, setMessages] = useState([{
    id: 'welcome', role: 'bot',
    text: `Ciao! Dimmi come vuoi strutturare il torneo con ${n} squadre. Puoi scrivere liberamente: "3 gironi, le prime 2 vanno in semifinale con partita per il terzo posto".`,
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastFormat, setLastFormat] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async (textArg) => {
    const text = (textArg || input).trim()
    if (!text || loading) return

    const userMsg = { id: Date.now() + 'u', role: 'user', text }
    const loadingMsg = { id: Date.now() + 'l', role: 'bot', loading: true }

    setMessages(prev => [...prev, userMsg, loadingMsg])
    setInput('')
    setLoading(true)

    let format, explanation, isError = false

    try {
      const result = await parseFormatAI(text, n)
      format = result.format
      explanation = result.explanation
    } catch (err) {
      // Fallback to local parser
      format = parseFormatLocal(text, n)
      explanation = '(Gemini non disponibile — ho usato il parser locale) ' +
        `Formato rilevato: ${FORMAT_LABELS[format.type] || format.type}.`
      isError = true
    }

    setLastFormat(format)
    setLoading(false)

    const botMsg = {
      id: Date.now() + 'b', role: 'bot',
      text: explanation,
      formatPreview: format,
      numTeams: n,
      error: isError,
    }

    setMessages(prev => prev.filter(m => !m.loading).concat(botMsg))
  }

  const reset = () => {
    setMessages([{ id: 'reset', role: 'bot', text: `Ricominciamo! Dimmi come vuoi il torneo con ${n} squadre.` }])
    setLastFormat(null)
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const showSuggestions = messages.length <= 2 && !loading

  return (
    <div className="flex flex-col" style={{ minHeight: '420px' }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-2 pr-1 max-h-72">
        {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
        <div ref={bottomRef} />
      </div>

      {/* Suggestion chips */}
      {showSuggestions && (
        <div className="flex flex-wrap gap-1.5 py-2 border-t border-gray-800">
          {SUGGESTIONS.map((s, i) => (
            <button key={i} onClick={() => send(s)} disabled={loading}
              className="text-[11px] bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-2.5 py-1 rounded-full transition-all disabled:opacity-50">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 pt-3 border-t border-gray-700">
        <input
          className="flex-1 bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-500 disabled:opacity-50"
          placeholder="Descrivi il formato del torneo..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button onClick={() => send()} disabled={!input.trim() || loading}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white p-2.5 rounded-xl transition-all">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-3">
        <button onClick={onBack} disabled={loading}
          className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-all">
          <ChevronLeft size={16} /> Indietro
        </button>
        {lastFormat && messages.length > 1 && (
          <button onClick={reset} disabled={loading}
            className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-300 py-2.5 px-3 rounded-xl transition-all" title="Ricomincia">
            <RotateCcw size={15} />
          </button>
        )}
        <button onClick={() => onGenerate(lastFormat)} disabled={!lastFormat || loading}
          className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-all">
          <Wand2 size={16} /> Genera formato
        </button>
      </div>
    </div>
  )
}
