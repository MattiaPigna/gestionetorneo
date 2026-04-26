import { useTournament } from '../store/tournamentStore'
import { AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

export default function AlertPanel() {
  const { state } = useTournament()
  const { violations } = state || []
  const [expanded, setExpanded] = useState(true)

  if (!violations || violations.length === 0) {
    return (
      <div className="flex items-center gap-2 bg-emerald-950/50 border border-emerald-800/50 rounded-xl px-4 py-2.5">
        <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
        <span className="text-emerald-300 text-sm font-medium">Nessun conflitto rilevato</span>
      </div>
    )
  }

  const errors = violations.filter(v => v.severity === 'error')
  const warnings = violations.filter(v => v.severity === 'warning')

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${errors.length > 0 ? 'border-red-700/60 bg-red-950/30' : 'border-amber-700/60 bg-amber-950/30'}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-2.5"
      >
        {errors.length > 0
          ? <XCircle size={16} className="text-red-400 flex-shrink-0" />
          : <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
        }
        <span className={`text-sm font-semibold flex-1 text-left ${errors.length > 0 ? 'text-red-300' : 'text-amber-300'}`}>
          {errors.length > 0
            ? `${errors.length} errore${errors.length > 1 ? 'i' : ''}`
            : ''
          }
          {warnings.length > 0
            ? `${errors.length > 0 ? ', ' : ''}${warnings.length} avviso${warnings.length > 1 ? 'i' : ''}`
            : ''
          }
        </span>
        {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-1.5">
          {violations.map((v, i) => (
            <div key={i} className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2 ${
              v.severity === 'error' ? 'bg-red-900/40 text-red-200' : 'bg-amber-900/40 text-amber-200'
            }`}>
              {v.severity === 'error'
                ? <XCircle size={13} className="text-red-400 mt-0.5 flex-shrink-0" />
                : <AlertTriangle size={13} className="text-amber-400 mt-0.5 flex-shrink-0" />
              }
              <span>{v.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
