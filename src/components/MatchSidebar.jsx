import { useTournament } from '../store/tournamentStore'
import MatchCard from './MatchCard'
import { ListChecks, Layers } from 'lucide-react'

export default function MatchSidebar() {
  const { state } = useTournament()
  const { matches, schedule } = state

  const scheduledIds = new Set(Object.values(schedule))
  const unscheduled = matches.filter(m => !scheduledIds.has(m.id))
  const scheduled = matches.filter(m => scheduledIds.has(m.id))

  const byRound = {}
  unscheduled.forEach(m => {
    if (!byRound[m.round]) byRound[m.round] = []
    byRound[m.round].push(m)
  })

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <ListChecks size={16} className="text-blue-400" />
            Da pianificare
          </h3>
          <span className="bg-blue-500/20 text-blue-300 text-xs font-bold px-2 py-0.5 rounded-full">
            {unscheduled.length}
          </span>
        </div>

        {unscheduled.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-4">
            Tutte le partite sono pianificate!
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(byRound).map(([round, ms]) => (
              <div key={round}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">{round}</div>
                <div className="space-y-1.5">
                  {ms.map(m => (
                    <MatchCard key={m.id} matchId={m.id} compact={false} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Layers size={16} className="text-emerald-400" />
            Pianificate
          </h3>
          <span className="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-2 py-0.5 rounded-full">
            {scheduled.length} / {matches.length}
          </span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${matches.length ? (scheduled.length / matches.length) * 100 : 0}%` }}
          />
        </div>
        <div className="text-xs text-gray-400 mt-1 text-right">
          {matches.length ? Math.round((scheduled.length / matches.length) * 100) : 0}%
        </div>
      </div>
    </aside>
  )
}
