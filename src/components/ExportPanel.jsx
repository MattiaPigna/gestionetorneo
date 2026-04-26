import { useTournament } from '../store/tournamentStore'
import { calcSlotTime } from '../utils/time'
import { Download, Printer, ArrowLeft, Calendar, Users } from 'lucide-react'

export default function ExportPanel() {
  const { state, dispatch } = useTournament()
  const { config, matches, teams, schedule } = state

  const matchMap = Object.fromEntries(matches.map(m => [m.id, m]))
  const teamMap = Object.fromEntries(teams.map(t => [t.id, t]))

  const days = Array.from({ length: config.numDays }, (_, i) => i)

  const getMatchesForDay = (dayIdx) => {
    const result = []
    for (let s = 0; s < config.slotsPerDay; s++) {
      const key = `d${dayIdx}-s${s}`
      if (schedule[key]) {
        result.push({ slotIdx: s, matchId: schedule[key], match: matchMap[schedule[key]] })
      }
    }
    return result
  }

  const downloadJSON = () => {
    const data = {
      ...state,
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${config.name.replace(/\s+/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => window.print()

  const scheduledCount = Object.keys(schedule).length

  return (
    <div className="min-h-screen p-6">
      {/* Controls - hidden on print */}
      <div className="no-print flex items-center gap-4 mb-6">
        <button
          onClick={() => dispatch({ type: 'SET_STEP', payload: 'build' })}
          className="flex items-center gap-2 text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-xl transition-all"
        >
          <ArrowLeft size={16} /> Torna all'Editor
        </button>
        <h1 className="text-xl font-bold text-white flex-1">{config.name}</h1>
        <button
          onClick={downloadJSON}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl transition-all"
        >
          <Download size={16} /> Scarica JSON
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-xl transition-all"
        >
          <Printer size={16} /> Stampa
        </button>
      </div>

      {/* Print header */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-3xl font-bold">{config.name}</h1>
        <p className="text-gray-600 mt-1">{config.sport} · {config.numDays} giorni · {teams.length} squadre</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6 no-print">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Calendar size={14} /> Partite pianificate
          </div>
          <div className="text-2xl font-bold text-white">{scheduledCount} / {matches.length}</div>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Users size={14} /> Squadre
          </div>
          <div className="text-2xl font-bold text-white">{teams.length}</div>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4">
          <div className="text-gray-400 text-sm mb-1">Giorni</div>
          <div className="text-2xl font-bold text-white">{config.numDays}</div>
        </div>
      </div>

      {/* Per-day schedule */}
      <div className="space-y-6">
        {days.map(d => {
          const dayMatches = getMatchesForDay(d)
          if (dayMatches.length === 0) return null
          return (
            <div key={d} className="bg-gray-900 print:bg-white border border-gray-700 print:border-gray-300 rounded-2xl overflow-hidden print-table">
              <div className="bg-gray-800 print:bg-gray-100 px-5 py-3 flex items-center gap-3">
                <span className="font-bold text-white print:text-black">Giorno {d + 1}</span>
                <span className="text-gray-400 print:text-gray-600 text-sm">{dayMatches.length} partite</span>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700 print:border-gray-200">
                    <th className="text-left px-5 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 print:text-gray-400 w-20">Orario</th>
                    <th className="text-left px-5 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 print:text-gray-400 w-20">Codice</th>
                    <th className="text-left px-5 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 print:text-gray-400">Fase</th>
                    <th className="text-left px-5 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 print:text-gray-400">Squadra 1</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 print:text-gray-400">vs</th>
                    <th className="text-left px-5 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 print:text-gray-400">Squadra 2</th>
                    <th className="text-left px-5 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 print:text-gray-400 w-32 print:block hidden">Risultato</th>
                  </tr>
                </thead>
                <tbody>
                  {dayMatches.map(({ slotIdx, matchId, match }) => {
                    if (!match) return null
                    const t1 = teamMap[match.team1Id]
                    const t2 = teamMap[match.team2Id]
                    const isPlaceholder = match.bracket === 'knockout' && !match.team1Id
                    return (
                      <tr key={matchId} className="border-b border-gray-800 print:border-gray-100 hover:bg-gray-800/40 print:hover:bg-white transition-colors">
                        <td className="px-5 py-3 font-mono text-sm text-gray-300 print:text-gray-700">
                          {calcSlotTime(config, slotIdx)}
                        </td>
                        <td className="px-5 py-3 text-xs font-bold text-blue-400 print:text-blue-600">{match.label}</td>
                        <td className="px-5 py-3 text-xs text-gray-400 print:text-gray-600">{match.round}</td>
                        <td className="px-5 py-3">
                          {isPlaceholder
                            ? <span className="text-gray-500 italic text-sm">{match.placeholder1 || '—'}</span>
                            : <TeamCell team={t1} />
                          }
                        </td>
                        <td className="px-3 py-3 text-center text-gray-500 font-bold text-xs">vs</td>
                        <td className="px-5 py-3">
                          {isPlaceholder
                            ? <span className="text-gray-500 italic text-sm">{match.placeholder2 || '—'}</span>
                            : <TeamCell team={t2} />
                          }
                        </td>
                        <td className="px-5 py-3 print:block hidden">
                          <div className="flex items-center gap-2">
                            <input type="text" placeholder="____ - ____" className="bg-gray-800 print:bg-white print:border-b print:border-gray-400 border border-gray-600 rounded px-2 py-1 text-xs text-white print:text-black w-28 focus:outline-none" readOnly />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>

      {/* Teams legend */}
      <div className="mt-6 bg-gray-900 print:bg-white border border-gray-700 print:border-gray-300 rounded-2xl p-5">
        <h3 className="font-semibold text-white print:text-black mb-3">Squadre Partecipanti</h3>
        <div className="grid grid-cols-4 gap-2">
          {teams.map(t => (
            <div key={t.id} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
              <span className="text-sm text-gray-200 print:text-gray-800">{t.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TeamCell({ team }) {
  if (!team) return <span className="text-gray-500 text-sm">—</span>
  return (
    <div className="flex items-center gap-2">
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />
      <span className="text-sm text-white print:text-black font-medium">{team.name}</span>
    </div>
  )
}
