import { useState } from 'react'
import { useAuth } from '../store/authStore'
import { login as apiLogin, register as apiRegister } from '../api'
import { Trophy, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginScreen() {
  const { login } = useAuth()
  const [tab, setTab]         = useState('login')   // 'login' | 'register'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password) { setError('Compila tutti i campi'); return }
    setLoading(true)
    try {
      const fn = tab === 'login' ? apiLogin : apiRegister
      const { token } = await fn(username.trim(), password)
      login(token)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-950">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-500/20 rounded-2xl mb-4">
            <Trophy size={28} className="text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Tournament Architect</h1>
          <p className="text-gray-500 text-sm mt-1">Gestione calendari tornei</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-700">
            {[['login', 'Accedi'], ['register', 'Registrati']].map(([id, label]) => (
              <button
                key={id}
                onClick={() => { setTab(id); setError('') }}
                className={`flex-1 py-3.5 text-sm font-semibold transition-all ${
                  tab === id
                    ? 'text-white border-b-2 border-blue-400 bg-blue-500/5'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="p-6 space-y-4">
            {error && (
              <div className="text-xs text-red-300 bg-red-900/30 border border-red-700/40 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Username</label>
              <input
                type="text"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="il_tuo_username"
              />
              {tab === 'register' && (
                <div className="text-[10px] text-gray-600 mt-1">Minimo 3 caratteri, solo lettere e numeri</div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 pr-10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {tab === 'register' && (
                <div className="text-[10px] text-gray-600 mt-1">Minimo 6 caratteri</div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-all mt-2"
            >
              {loading
                ? <><Loader2 size={16} className="animate-spin" /> Caricamento...</>
                : tab === 'login' ? 'Accedi' : 'Crea account'
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
