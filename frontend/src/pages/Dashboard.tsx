import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { trailsApi, teamsApi } from '../services/api'
import { useAuthStore } from '../store/authStore'
import type { Trail, User } from '../types'

function SkeletonCard() {
  return (
    <div className="card p-5 space-y-3">
      <div className="flex justify-between">
        <div className="skeleton h-5 w-2/3 rounded" />
        <div className="skeleton h-5 w-14 rounded-full" />
      </div>
      <div className="skeleton h-3 w-full rounded" />
      <div className="skeleton h-3 w-1/2 rounded" />
      <div className="flex gap-2 pt-1">
        <div className="skeleton h-9 flex-1 rounded-lg" />
        <div className="skeleton h-9 flex-1 rounded-lg" />
      </div>
    </div>
  )
}

function RaceCard({ trail, user, onDelete }: { trail: Trail, user: User | null, onDelete: (id: string) => void }) {
  const isLive = trail.isActive
  const canDelete = user?.role === 'superuser' || user?.uuid === trail.createdBy

  return (
    <div className="card overflow-hidden hover:shadow-md transition-shadow group">
      {/* Color accent strip */}
      <div
        className={`h-1.5 w-full ${isLive ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-slate-200 to-slate-300'}`}
      />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h2 className="font-bold text-slate-900 text-base leading-snug group-hover:text-green-700 transition-colors">
            {trail.name}
          </h2>
          <div className="flex items-center gap-2">
            {isLive ? (
              <span className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                <span className="relative flex h-2 w-2">
                  <span className="live-dot relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                En vivo
              </span>
            ) : (
              <span className="flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
                Inactiva
              </span>
            )}
            {canDelete && (
              <button onClick={(e) => { e.preventDefault(); if(confirm('¿Seguro que querés eliminar esta carrera?')) onDelete(trail.trailUuid) }} className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-colors" title="Eliminar carrera">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>
              </button>
            )}
          </div>
        </div>

        {trail.description && (
          <p className="text-slate-500 text-sm mb-3 line-clamp-2">{trail.description}</p>
        )}

        <div className="flex flex-wrap gap-3 text-sm text-slate-500 mb-4">
          {trail.distanceKm > 0 && (
            <span className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18"/>
              </svg>
              {trail.distanceKm} km
            </span>
          )}
          {trail.elevationM > 0 && (
            <span className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 17l5-8 4 5 3-4 6 7H3z"/>
              </svg>
              +{trail.elevationM} m
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <Link
            to={`/races/${trail.trailUuid}/live`}
            className="flex-1 text-center text-sm font-semibold bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg transition-colors"
          >
            Ver en vivo
          </Link>
          <Link
            to={`/races/${trail.trailUuid}/results`}
            className="flex-1 text-center text-sm font-medium border border-slate-200 hover:bg-slate-50 text-slate-700 py-2.5 rounded-lg transition-colors"
          >
            Resultados
          </Link>
          <Link
            to={`/races/${trail.trailUuid}/notifications`}
            className="px-3 text-center text-sm font-medium border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 py-2.5 rounded-lg transition-colors"
            title="Eventos"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const [trails, setTrails] = useState<Trail[]>([])
  const [requests, setRequests] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    trailsApi.list()
      .then((r) => setTrails(r.data))
      .catch(() => setError('Error al cargar las carreras'))
      .finally(() => setLoading(false))

    if (user?.role === 'organizer') {
      teamsApi.getRequests().then(r => setRequests(r.data)).catch(() => {})
    }
  }, [user])

  function showActionError(msg: string) {
    setActionError(msg)
    setTimeout(() => setActionError(''), 4000)
  }

  const handleDelete = (id: string) => {
    trailsApi.delete(id).then(() => {
      setTrails(t => t.filter(x => x.trailUuid !== id))
    }).catch(() => showActionError('No se pudo eliminar la carrera. Intentá de nuevo.'))
  }

  const handleRequest = (userId: string, action: 'accept' | 'reject') => {
    const apiCall = action === 'accept' ? teamsApi.acceptRequest(userId) : teamsApi.rejectRequest(userId)
    apiCall.then(() => setRequests(reqs => reqs.filter(r => r.uuid !== userId)))
      .catch(() => showActionError('No se pudo procesar la solicitud. Intentá de nuevo.'))
  }

  const [filter, setFilter] = useState<'all' | 'live' | 'mine'>('all')
  const [search, setSearch] = useState('')

  const liveCount = trails.filter((t) => t.isActive).length

  const visibleTrails = trails.filter((t) => {
    if (filter === 'live' && !t.isActive) return false
    if (filter === 'mine' && t.createdBy !== user?.uuid) return false
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Hola, {user?.nombre?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Equipo: <span className="font-medium text-slate-700">{user?.team || '—'}</span>
            {liveCount > 0 && (
              <span className="ml-3 inline-flex items-center gap-1 text-green-600 font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="live-dot relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                {liveCount} carrera{liveCount > 1 ? 's' : ''} en vivo
              </span>
            )}
          </p>
        </div>
        {['organizer', 'superuser'].includes(user?.role || '') && (
          <Link
            to="/races/new"
            className="btn-primary self-start sm:self-auto"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nueva carrera
          </Link>
        )}
      </div>

      {user?.teamStatus === 'pending' && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl mb-6 flex items-center gap-2 text-sm font-medium">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Tu solicitud para unirte al equipo {user.team} está pendiente de aprobación por el organizador.
        </div>
      )}

      {requests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Solicitudes de corredores</h2>
          <div className="card p-0 overflow-hidden divide-y divide-slate-100">
            {requests.map(req => (
              <div key={req.uuid} className="p-4 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{req.nombre}</p>
                  <p className="text-xs text-slate-500">@{req.user}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleRequest(req.uuid, 'accept')} className="text-xs font-medium px-3 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-colors">Aceptar</button>
                  <button onClick={() => handleRequest(req.uuid, 'reject')} className="text-xs font-medium px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors">Rechazar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter bar */}
      {!loading && !error && trails.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 flex-shrink-0">
            {([
              { key: 'all', label: 'Todas' },
              { key: 'live', label: `En vivo${liveCount > 0 ? ` (${liveCount})` : ''}` },
              { key: 'mine', label: 'Mis carreras' },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                  filter === key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar carrera..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* States */}
      {actionError && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          <span className="text-sm flex-1">{actionError}</span>
          <button onClick={() => setActionError('')} className="text-red-500 hover:text-red-700">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      {/* Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && trails.length === 0 && (
        <div className="card text-center py-16 px-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8">
              <path d="M3 17l4-8 4 4 3-6 4 10"/>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Sin carreras todavía</h3>
          <p className="text-slate-500 text-sm mb-6">
            {user?.role === 'organizer'
              ? 'Creá tu primera carrera para empezar a compartir el recorrido.'
              : 'Aún no hay carreras disponibles. Volvé más tarde.'}
          </p>
          {user?.role === 'organizer' && (
            <Link to="/races/new" className="btn-primary">
              Crear primera carrera
            </Link>
          )}
        </div>
      )}

      {/* Grid */}
      {!loading && trails.length > 0 && (
        visibleTrails.length === 0 ? (
          <div className="card text-center py-14 px-6 text-slate-400">
            <svg width="36" height="36" className="mx-auto mb-3 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <p className="font-medium text-slate-600">Sin resultados</p>
            <p className="text-sm mt-1">
              {search ? `No hay carreras que coincidan con "${search}".` : 'No hay carreras en esta categoría.'}
            </p>
            <button onClick={() => { setFilter('all'); setSearch('') }} className="mt-3 text-sm text-green-600 hover:text-green-700 font-semibold">
              Ver todas
            </button>
          </div>
        ) : filter === 'all' && !search ? (
          <>
            {liveCount > 0 && (
              <div className="mb-6">
                <h2 className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-3">En vivo ahora</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visibleTrails.filter((t) => t.isActive).map((t) => <RaceCard key={t.trailUuid} trail={t} user={user} onDelete={handleDelete} />)}
                </div>
              </div>
            )}
            {visibleTrails.some((t) => !t.isActive) && (
              <div>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Inactivas</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visibleTrails.filter((t) => !t.isActive).map((t) => <RaceCard key={t.trailUuid} trail={t} user={user} onDelete={handleDelete} />)}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleTrails.map((t) => <RaceCard key={t.trailUuid} trail={t} user={user} onDelete={handleDelete} />)}
          </div>
        )
      )}
    </div>
  )
}
