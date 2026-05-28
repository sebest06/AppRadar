import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { authApi, teamsApi } from '../services/api'

const roles = [
  { value: 'runner', label: 'Corredor', desc: 'Participa en carreras con GPS tracking' },
  { value: 'organizer', label: 'Organizador', desc: 'Crea y gestiona carreras' },
]

export default function Register() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [form, setForm] = useState({
    nombre: '', user: '', passw: '', confirmPassw: '', team: '', uuid_team: '',
    role: 'runner' as 'runner' | 'organizer',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [teams, setTeams] = useState<{ uuid_team: string; team: string }[]>([])

  useEffect(() => {
    teamsApi.list().then((res) => setTeams(res.data)).catch(() => {})
  }, [])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.passw !== form.confirmPassw) { setError('Las contraseñas no coinciden'); return }
    if (form.passw.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setLoading(true)
    try {
      const { data } = await authApi.register({ 
        user: form.user, passw: form.passw, nombre: form.nombre, 
        team: form.role === 'organizer' ? form.team : undefined, 
        uuid_team: form.role === 'runner' ? form.uuid_team : undefined,
        role: form.role 
      })
      login(data.user, data.token, data.refreshToken)
      navigate('/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: '#f8fafc' }}>
      <div className="card w-full max-w-lg p-8">
        {/* Header */}
        <div className="text-center mb-7">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3"
            style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 17l4-8 4 4 3-6 4 10" /><circle cx="12" cy="5" r="1.5" fill="white" stroke="none" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Crear cuenta</h1>
          <p className="text-slate-500 text-sm mt-1">Completá tus datos para empezar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role selector */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Soy…</label>
            <div className="grid grid-cols-2 gap-3">
              {roles.map((r) => (
                <label
                  key={r.value}
                  className={`flex flex-col gap-1 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    form.role === r.value
                      ? 'border-green-500 bg-green-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={form.role === r.value}
                    onChange={set('role')}
                    className="sr-only"
                  />
                  <span className="font-semibold text-sm text-slate-900">{r.label}</span>
                  <span className="text-xs text-slate-500 leading-tight">{r.desc}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre completo</label>
              <input required value={form.nombre} onChange={set('nombre')} className="input-base" placeholder="Juan Pérez" autoComplete="name" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Usuario</label>
              <input required value={form.user} onChange={set('user')} className="input-base" placeholder="juan123" autoComplete="username" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Equipo</label>
              {form.role === 'runner' ? (
                <select required value={form.uuid_team} onChange={set('uuid_team')} className="input-base">
                  <option value="" disabled>Seleccioná un equipo</option>
                  {teams.map((t) => (
                    <option key={t.uuid_team} value={t.uuid_team}>{t.team}</option>
                  ))}
                </select>
              ) : (
                <input required value={form.team} onChange={set('team')} className="input-base" placeholder="Nombre de tu equipo" />
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Contraseña</label>
              <input required type="password" value={form.passw} onChange={set('passw')} className="input-base" placeholder="Mínimo 6 caracteres" autoComplete="new-password" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirmar contraseña</label>
              <input required type="password" value={form.confirmPassw} onChange={set('confirmPassw')} className="input-base" placeholder="••••••••" autoComplete="new-password" />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? (
              <>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25"/>
                  <path d="M21 12a9 9 0 00-9-9"/>
                </svg>
                Creando cuenta...
              </>
            ) : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-5">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="font-semibold text-green-600 hover:text-green-700">Ingresar</Link>
        </p>
      </div>
    </div>
  )
}
