import { useEffect, useState } from 'react'
import { useAuth } from '../store/authStore'
import { useTournament } from '../store/tournamentStore'
import { fetchTournaments, loadTournament, deleteTournament } from '../api'
import { formatDateShort } from '../utils/dates'
import {
  Trophy, Plus, FolderOpen, Trash2, RefreshCw,
  LogOut, Calendar, Users, AlertCircle
} from 'lucide-react'

function fmt(iso) {
  return formatDateShort(iso.split('T')[0])
}

function TournamentCard({ row, onOpen, onDelete, deleting }) {
  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-5 flex flex-col gap-3 hover:border-gray-500 transition-all group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white text-base truncate">{row.name}</h3>
          {row.sport && (
            <span className="inline-block mt-1 text-[10px] font-semibold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
              {row.sport}
            </span>
          )}
        </div>
        <button
          onClick={() => onDelete(row.id)}
          disabled={deleting}
          className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all flex-shrink-0 p-1"
          title="Elimina"
        >
          {deleting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Calendar size={11} />
          Modificato: {fmt(row.updated_at)}
        </span>
      </div>

      <button
        onClick={() => onOpen(row.id)}
        className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold py-2 rounded-xl transition-all"
      >
        <FolderOpen size={14} /> Apri torneo
      </button>
    </div>
  )
}

export default function Dashboard() {
  const { user, logout } = useAuth()
  const { dispatch } = useTournament()
  const [list, setList]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [opening, setOpening] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      setList(await fetchTournaments())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleOpen = async (id) => {
    setOpening(id)
    try {
      const row = await loadTournament(id)
      dispatch({ type: 'LOAD_STATE', payload: { ...row.data, savedId: row.id } })
    } catch (e) {
      setError(e.message)
    } finally {
      setOpening(null)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Eliminare questo torneo? L\'operazione è irreversibile.')) return
    setDeleting(id)
    try {
      await deleteTournament(id)
      setList(l => l.filter(r => r.id !== id))
    } catch (e) {
      setError(e.message)
    } finally {
      setDeleting(null)
    }
  }

  const handleNew = () => {
    dispatch({ type: 'RESET' })
    dispatch({ type: 'SET_STEP', payload: 'setup' })
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-3">
        <div className="w-9 h-9 bg-blue-500/20 rounded-xl flex items-center justify-center">
          <Trophy size={18} className="text-blue-400" />
        </div>
        <span className="text-white font-bold text-lg">Tournament Architect</span>
        <div className="flex-1" />
        <span className="text-sm text-gray-400 font-medium">{user?.username}</span>
        <button
          onClick={logout}
          title="Esci"
          className="text-gray-500 hover:text-red-400 p-2 rounded-lg hover:bg-gray-800 transition-all"
        >
          <LogOut size={16} />
        </button>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-10">
        {/* CTA */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">I miei tornei</h2>
            <p className="text-gray-500 text-sm mt-1">
              {list.length > 0 ? `${list.length} torneo salvato` : 'Nessun torneo ancora'}
            </p>
          </div>
          <button
            onClick={handleNew}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-all"
          >
            <Plus size={18} /> Nuovo torneo
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-300 bg-red-900/30 border border-red-700/40 rounded-xl px-4 py-3 mb-6">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20 text-gray-500 gap-3">
            <RefreshCw size={18} className="animate-spin" /> Caricamento...
          </div>
        )}

        {/* Empty state */}
        {!loading && list.length === 0 && !error && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trophy size={28} className="text-gray-600" />
            </div>
            <p className="text-gray-400 font-medium">Nessun torneo salvato</p>
            <p className="text-gray-600 text-sm mt-1">Crea il tuo primo torneo con il pulsante qui sopra</p>
          </div>
        )}

        {/* Tournament grid */}
        {!loading && list.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map(row => (
              <div key={row.id} className={opening === row.id ? 'opacity-60 pointer-events-none' : ''}>
                <TournamentCard
                  row={row}
                  onOpen={handleOpen}
                  onDelete={handleDelete}
                  deleting={deleting === row.id}
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
