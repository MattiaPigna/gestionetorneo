import { useState, useEffect } from 'react'
import { useTournament } from '../store/tournamentStore'
import { fetchTournaments, saveTournament, loadTournament, deleteTournament } from '../api'
import { Cloud, Save, FolderOpen, Trash2, X, RefreshCw, Check, AlertCircle } from 'lucide-react'

function fmt(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function CloudModal({ savedId, onSaved, onLoaded, onClose }) {
  const { state, dispatch } = useTournament()
  const [tab, setTab] = useState('save')
  const [name, setName] = useState(state.config.name || '')
  const [list, setList] = useState([])
  const [fetching, setFetching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const loadList = async () => {
    setFetching(true)
    setError('')
    try {
      const rows = await fetchTournaments()
      setList(rows)
    } catch (e) {
      setError(e.message)
    } finally {
      setFetching(false)
    }
  }

  useEffect(() => {
    if (tab === 'load') loadList()
  }, [tab])

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    setError('')
    try {
      const row = await saveTournament(savedId, name.trim(), state.config.sport, state)
      setSuccessMsg(savedId ? 'Torneo aggiornato!' : 'Torneo salvato!')
      onSaved(row.id, row.name)
      setTimeout(() => setSuccessMsg(''), 2500)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleLoad = async (id) => {
    setError('')
    try {
      const row = await loadTournament(id)
      dispatch({ type: 'LOAD_STATE', payload: row.data })
      onLoaded(row.id, row.name)
      onClose()
    } catch (e) {
      setError(e.message)
    }
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Eliminare questo torneo dal server?')) return
    setDeletingId(id)
    try {
      await deleteTournament(id)
      setList(l => l.filter(r => r.id !== id))
      if (savedId === id) onSaved(null, '')
    } catch (e) {
      setError(e.message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-700">
          <Cloud size={18} className="text-blue-400" />
          <span className="text-white font-semibold">Tornei salvati</span>
          <div className="flex-1" />
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {[['save', Save, 'Salva'], ['load', FolderOpen, 'Carica']].map(([id, Icon, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all ${
                tab === id
                  ? 'text-blue-300 border-b-2 border-blue-400 bg-blue-500/5'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* Error / success */}
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-300 bg-red-900/30 border border-red-700/40 rounded-lg px-3 py-2 mb-4">
              <AlertCircle size={13} /> {error}
            </div>
          )}
          {successMsg && (
            <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-900/30 border border-emerald-700/40 rounded-lg px-3 py-2 mb-4">
              <Check size={13} /> {successMsg}
            </div>
          )}

          {tab === 'save' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Nome torneo</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome del torneo..."
                />
              </div>
              <div className="text-xs text-gray-500 bg-gray-800/60 rounded-lg px-3 py-2">
                {savedId
                  ? `Sovrascriverà il salvataggio corrente (#${savedId})`
                  : 'Salvato nel browser (localStorage) — resta disponibile alla prossima apertura'
                }
              </div>
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all"
              >
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Salvataggio...' : savedId ? 'Aggiorna' : 'Salva nel cloud'}
              </button>
            </div>
          )}

          {tab === 'load' && (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {fetching && (
                <div className="flex items-center justify-center py-8 text-gray-500 text-sm gap-2">
                  <RefreshCw size={14} className="animate-spin" /> Caricamento...
                </div>
              )}
              {!fetching && list.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">Nessun torneo salvato</div>
              )}
              {list.map(row => (
                <div
                  key={row.id}
                  onClick={() => handleLoad(row.id)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all group border ${
                    savedId === row.id
                      ? 'border-blue-500/40 bg-blue-500/10'
                      : 'border-gray-700/50 bg-gray-800/60 hover:bg-gray-700/60 hover:border-gray-600'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">{row.name}</span>
                      {savedId === row.id && (
                        <span className="text-[9px] bg-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded-full flex-shrink-0">corrente</span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      {row.sport && <span className="mr-2">{row.sport}</span>}
                      {fmt(row.updated_at)}
                    </div>
                  </div>
                  <button
                    onClick={e => handleDelete(row.id, e)}
                    disabled={deletingId === row.id}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all flex-shrink-0"
                  >
                    {deletingId === row.id
                      ? <RefreshCw size={13} className="animate-spin" />
                      : <Trash2 size={13} />
                    }
                  </button>
                </div>
              ))}
              {!fetching && list.length > 0 && (
                <button
                  onClick={loadList}
                  className="w-full text-center text-xs text-gray-500 hover:text-gray-300 py-2 transition-colors"
                >
                  <RefreshCw size={11} className="inline mr-1" /> Aggiorna lista
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
