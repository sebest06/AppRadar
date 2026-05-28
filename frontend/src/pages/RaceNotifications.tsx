import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { racesApi, trailsApi } from '../services/api'
import type { RaceEvent, RaceSession, Trail } from '../types'

function eventLabel(type: RaceEvent['type']) {
  if (type === 'sos') return { icon: '🆘', label: 'S.O.S', color: 'bg-red-100 text-red-700 border-red-200' }
  if (type === 'completed') return { icon: '🏆', label: 'Finalizó', color: 'bg-blue-100 text-blue-700 border-blue-200' }
  return { icon: '🛑', label: 'Abandonó', color: 'bg-orange-100 text-orange-700 border-orange-200' }
}

function formatTimestamp(ts: number | null) {
  if (!ts) return '--'
  return new Date(ts).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export default function RaceNotifications() {
  const { id } = useParams<{ id: string }>()
  const [trail, setTrail] = useState<Trail | null>(null)
  const [sessions, setSessions] = useState<RaceSession[]>([])
  const [activeSession, setActiveSession] = useState<string>('')
  const [events, setEvents] = useState<RaceEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [eventsError, setEventsError] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      trailsApi.details(id),
      racesApi.sessions(id, { limit: 100 }),
    ]).then(([trailRes, sessRes]) => {
      setTrail(trailRes.data)
      setSessions(sessRes.data.data)
      if (sessRes.data.data.length > 0) setActiveSession(sessRes.data.data[0].sessionUuid)
    }).catch(() => setError(true)).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setEventsError(false)
    racesApi.events(id, activeSession || undefined)
      .then((r) => setEvents(r.data))
      .catch(() => setEventsError(true))
      .finally(() => setLoading(false))
  }, [id, activeSession])

  if (loading && !trail) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 px-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
        </div>
        <p className="text-slate-700 font-medium">No se pudo cargar la carrera.<br/>Verificá tu conexión e intentá de nuevo.</p>
        <button onClick={() => window.location.reload()} className="btn-primary text-sm py-2 px-4">
          Reintentar
        </button>
      </div>
    )
  }

  const sosEvents = events.filter(e => e.type === 'sos')
  const completedEvents = events.filter(e => e.type === 'completed')
  const abandonedEvents = events.filter(e => e.type === 'abandoned')

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6">
        <Link to="/" className="text-slate-500 hover:text-slate-700 flex items-center gap-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M5 12l7-7M5 12l7 7"/></svg>
          Carreras
        </Link>
        <span className="text-slate-300">/</span>
        <Link to={`/races/${id}/live`} className="text-slate-500 hover:text-slate-700 truncate max-w-[160px]">
          {trail?.name ?? 'Carrera'}
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-900 font-medium">Eventos</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Eventos de la carrera</h1>
        <Link to={`/races/${id}/live`} className="btn-ghost text-sm py-1.5 px-3">
          Ver en vivo
        </Link>
      </div>

      {/* Session selector */}
      {sessions.length > 1 && (
        <div className="mb-5">
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Sesión</label>
          <select
            value={activeSession}
            onChange={(e) => setActiveSession(e.target.value)}
            className="input-base w-full sm:w-auto"
          >
            <option value="">Todas las sesiones</option>
            {sessions.map((s) => (
              <option key={s.sessionUuid} value={s.sessionUuid}>
                {new Date(s.startTime).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · {s.runnerCount} corredores
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Summary badges */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {sosEvents.length > 0 && (
          <div className="flex items-center gap-1.5 bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-full text-sm font-semibold">
            🆘 {sosEvents.length} S.O.S
          </div>
        )}
        <div className="flex items-center gap-1.5 bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-full text-sm font-semibold">
          🏆 {completedEvents.length} finalizaron
        </div>
        <div className="flex items-center gap-1.5 bg-orange-100 text-orange-700 border border-orange-200 px-3 py-1.5 rounded-full text-sm font-semibold">
          🛑 {abandonedEvents.length} abandonaron
        </div>
      </div>

      {/* Event list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : eventsError ? (
        <div className="card flex items-center gap-4 p-5 border-l-4 border-red-400">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          <p className="text-slate-700 text-sm flex-1">No se pudieron cargar los eventos.</p>
          <button onClick={() => setEventsError(false)} className="text-sm text-green-600 hover:text-green-700 font-semibold whitespace-nowrap">
            Reintentar
          </button>
        </div>
      ) : events.length === 0 ? (
        <div className="card p-10 text-center text-slate-400">
          <svg width="40" height="40" className="mx-auto mb-3 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
          <p className="font-medium">No hay eventos registrados aún</p>
          <p className="text-sm mt-1">Los eventos aparecen cuando un corredor finaliza, abandona o activa el S.O.S</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((e) => {
            const { icon, label, color } = eventLabel(e.type)
            return (
              <div
                key={e.runUuid}
                className={`card p-4 flex items-center gap-4 border ${color}`}
              >
                <span className="text-2xl flex-shrink-0">{icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 truncate">{e.userName}</p>
                  {e.teamName && <p className="text-xs text-slate-500 truncate">{e.teamName}</p>}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${color}`}>{label}</span>
                  <span className="text-xs text-slate-400 font-mono">{formatTimestamp(e.endTime ?? e.startTime)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
