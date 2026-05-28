import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { authApi } from '../services/api'

export default function Login() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [form, setForm] = useState({ user: '', passw: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await authApi.login(form.user, form.passw)
      login(data.user, data.token, data.refreshToken)
      navigate('/')
    } catch {
      setError('Usuario o contraseña incorrectos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Brand panel — hidden on mobile */}
      <div
        className="hidden lg:flex flex-col justify-between w-1/2 p-12 text-white"
        style={{ background: 'linear-gradient(160deg, #14532d 0%, #166534 50%, #15803d 100%)' }}
      >
        <div className="flex items-center gap-3 text-2xl font-bold">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 17l4-8 4 4 3-6 4 10" />
            <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none" />
          </svg>
          AppRadar
        </div>

        <div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Seguí cada kilómetro<br />en tiempo real
          </h1>
          <p className="text-green-200 text-lg leading-relaxed mb-8">
            Seguimiento GPS para carreras de trail running. Conocé la posición de tu equipo en cualquier momento.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: '📍', label: 'GPS en vivo', desc: 'Posiciones actualizadas al instante' },
              { icon: '🏆', label: 'Leaderboard', desc: 'Clasificación en tiempo real' },
              { icon: '🗺️', label: 'Mapa interactivo', desc: 'Ruta y waypoints visualizados' },
              { icon: '📱', label: 'Sin señal', desc: 'Modo offline en la app Android' },
            ].map((f) => (
              <div key={f.label} className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                <span className="text-2xl">{f.icon}</span>
                <p className="font-semibold mt-2 text-sm">{f.label}</p>
                <p className="text-green-200 text-xs mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-green-300 text-sm">© 2025 AppRadar</p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-slate-50">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div
              className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
              style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 17l4-8 4 4 3-6 4 10" />
                <circle cx="12" cy="5" r="1.5" fill="white" stroke="none" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">AppRadar</h1>
            <p className="text-slate-500 text-sm mt-1">Seguimiento GPS para trail running</p>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">Bienvenido</h2>
          <p className="text-slate-500 text-sm mb-8">Ingresá a tu cuenta para continuar</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Usuario</label>
              <input
                type="text"
                required
                autoComplete="username"
                value={form.user}
                onChange={(e) => setForm({ ...form, user: e.target.value })}
                className="input-base"
                placeholder="tu_usuario"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Contraseña</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={form.passw}
                onChange={(e) => setForm({ ...form, passw: e.target.value })}
                className="input-base"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2">
              {loading ? (
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25"/>
                    <path d="M21 12a9 9 0 00-9-9"/>
                  </svg>
                  Ingresando...
                </>
              ) : 'Ingresar'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            ¿No tenés cuenta?{' '}
            <Link to="/register" className="font-semibold text-green-600 hover:text-green-700">
              Registrarse
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
