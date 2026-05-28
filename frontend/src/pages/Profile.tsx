import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { meApi } from '../services/api'
import { useAuthStore } from '../store/authStore'
import type { RunHistoryEntry } from '../types'

function formatTime(ms: number) {
  if (!ms) return '--:--:--'
  const s = Math.floor(ms / 1000)
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function formatDate(ts: number | null) {
  if (!ts) return '--'
  return new Date(ts).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function StatusBadge({ run }: { run: RunHistoryEntry }) {
  if (run.sos) return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">🆘 SOS</span>
  if (run.isCompleted) return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">✓ Completó</span>
  if (run.isAbandoned) return <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">✕ Abandonó</span>
  return <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">En carrera</span>
}

function ProfileTab({ user, onSaved }: { user: { nombre: string; activityType: string; team: string; role: string }; onSaved: (nombre: string, activityType: string) => void }) {
  const [nombre, setNombre] = useState(user.nombre)
  const [activityType, setActivityType] = useState(user.activityType || 'runner')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const [curPw, setCurPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwSuccess, setPwSuccess] = useState(false)
  const [pwError, setPwError] = useState('')

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(''); setSuccess(false)
    try {
      await meApi.update({ nombre: nombre.trim(), activityType })
      onSaved(nombre.trim(), activityType)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError('No se pudo guardar. Intentá de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPw !== confirmPw) { setPwError('Las contraseñas no coinciden'); return }
    setPwSaving(true); setPwError(''); setPwSuccess(false)
    try {
      await meApi.changePassword(curPw, newPw)
      setCurPw(''); setNewPw(''); setConfirmPw('')
      setPwSuccess(true)
      setTimeout(() => setPwSuccess(false), 3000)
    } catch (err: any) {
      setPwError(err?.response?.data?.error || 'No se pudo cambiar la contraseña.')
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Info card */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Información personal</h2>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
            <input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de actividad</label>
            <select
              value={activityType}
              onChange={e => setActivityType(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="runner">🏃 Corredor</option>
              <option value="bike">🚲 Ciclista</option>
              <option value="car">🚗 Vehículo</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm text-slate-500">
            <div><span className="block text-xs text-slate-400 mb-0.5">Equipo</span>{user.team || '—'}</div>
            <div><span className="block text-xs text-slate-400 mb-0.5">Rol</span>{user.role}</div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">Perfil actualizado.</p>}
          <button type="submit" disabled={saving} className="btn-primary text-sm py-2 px-5 disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>

      {/* Password card */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Cambiar contraseña</h2>
        <form onSubmit={handleChangePassword} className="space-y-3">
          {[
            { label: 'Contraseña actual', value: curPw, set: setCurPw },
            { label: 'Nueva contraseña', value: newPw, set: setNewPw },
            { label: 'Confirmar nueva contraseña', value: confirmPw, set: setConfirmPw },
          ].map(({ label, value, set }) => (
            <div key={label}>
              <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
              <input
                type="password"
                value={value}
                onChange={e => set(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          ))}
          {pwError && <p className="text-sm text-red-600">{pwError}</p>}
          {pwSuccess && <p className="text-sm text-green-600">Contraseña actualizada.</p>}
          <button type="submit" disabled={pwSaving || !curPw || !newPw || !confirmPw} className="btn-primary text-sm py-2 px-5 disabled:opacity-50">
            {pwSaving ? 'Guardando...' : 'Cambiar contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}

function HistoryTab() {
  const LIMIT = 20
  const [runs, setRuns] = useState<RunHistoryEntry[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    setLoading(true); setError(false)
    meApi.history({ limit: LIMIT, offset: 0 })
      .then(r => { setRuns(r.data.data); setTotal(r.data.total); setOffset(0) })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  function loadMore() {
    const next = offset + LIMIT
    meApi.history({ limit: LIMIT, offset: next })
      .then(r => { setRuns(prev => [...prev, ...r.data.data]); setOffset(next) })
  }

  const completed = runs.filter(r => r.isCompleted).length
  const abandoned = runs.filter(r => r.isAbandoned).length

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" /></div>

  if (error) return (
    <div className="card p-10 text-center text-slate-400">
      <p className="font-medium text-red-500">No se pudo cargar el historial.</p>
      <button onClick={() => { setError(false); setLoading(true); meApi.history({ limit: LIMIT, offset: 0 }).then(r => { setRuns(r.data.data); setTotal(r.data.total) }).catch(() => setError(true)).finally(() => setLoading(false)) }} className="mt-3 text-sm text-green-600 font-semibold">Reintentar</button>
    </div>
  )

  if (runs.length === 0) return (
    <div className="card p-10 text-center text-slate-400">
      <svg width="40" height="40" className="mx-auto mb-3 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 17l4-8 4 4 3-6 4 10"/></svg>
      <p className="font-medium">Sin carreras todavía</p>
      <p className="text-sm mt-1">Tu historial aparecerá aquí una vez que completes tu primera carrera.</p>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Carreras', value: total },
          { label: 'Completadas', value: completed },
          { label: 'Abandonadas', value: abandoned },
        ].map(({ label, value }) => (
          <div key={label} className="card p-3 text-center">
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="card overflow-hidden">
        <div className="divide-y divide-slate-50">
          {runs.map(run => (
            <div key={run.runUuid} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
              <div className="flex-1 min-w-0">
                <Link to={`/races/${run.trailUuid}/results`} className="font-semibold text-sm text-slate-900 hover:text-green-700 truncate block">
                  {run.trailName}
                </Link>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                  <span>{formatDate(run.startTime)}</span>
                  {run.distanceKm > 0 && <><span>·</span><span>{run.distanceKm} km</span></>}
                  {run.elevationM > 0 && <><span>·</span><span>+{run.elevationM} m</span></>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <StatusBadge run={run} />
                <span className="text-xs text-slate-400 font-mono">{formatTime(run.totalTime)}</span>
                <span className="text-xs text-slate-400">{run.waypointsReached}/{run.totalWaypoints} WP</span>
              </div>
            </div>
          ))}
        </div>
        {runs.length < total && (
          <div className="px-4 py-3 border-t border-slate-100 text-center">
            <button onClick={loadMore} className="text-sm text-green-600 hover:text-green-700 font-semibold">
              Ver más ({total - runs.length} restantes)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Profile() {
  const { user, login, refreshToken } = useAuthStore()
  const [tab, setTab] = useState<'profile' | 'history'>('profile')

  if (!user) return null

  function handleSaved(nombre: string, activityType: string) {
    if (!user || !refreshToken) return
    const updated = { ...user, nombre, activityType: activityType as 'runner' | 'bike' | 'car' }
    localStorage.setItem('user', JSON.stringify(updated))
    login(updated, localStorage.getItem('token') ?? '', refreshToken)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="text-slate-400 hover:text-slate-600">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M5 12l7-7M5 12l7 7"/></svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">Mi perfil</h1>
          <p className="text-sm text-slate-500">{user.user} · {user.team || 'Sin equipo'}</p>
        </div>
        <div className="w-12 h-12 rounded-full bg-green-100 border-2 border-green-200 flex items-center justify-center text-lg font-bold text-green-700">
          {user.nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6">
        {(['profile', 'history'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${tab === t ? 'border-green-600 text-green-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {t === 'profile' ? 'Editar perfil' : 'Mis carreras'}
          </button>
        ))}
      </div>

      {tab === 'profile'
        ? <ProfileTab user={user} onSaved={handleSaved} />
        : <HistoryTab />
      }
    </div>
  )
}
