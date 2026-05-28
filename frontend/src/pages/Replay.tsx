import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { racesApi, trailsApi } from '../services/api'
import type { ReplayData, ReplayRunner, TrailWithWaypoints } from '../types'

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const SPEEDS = [1, 5, 10, 30, 60]

function runnerIcon(name: string, runner: ReplayRunner, isActive: boolean) {
  const color = runner.sos ? '#ef4444' : runner.isCompleted ? '#2563eb' : runner.isAbandoned ? '#dc2626' : '#16a34a'
  const emoji = runner.sos ? '🆘' : runner.isCompleted ? '🏆' : runner.isAbandoned ? '🛑' : runner.activityType === 'bike' ? '🚲' : runner.activityType === 'car' ? '🚗' : '🏃'
  const opacity = isActive ? 1 : 0.4
  return L.divIcon({
    html: `<div style="opacity:${opacity};display:flex;flex-direction:column;align-items:center;gap:2px">
      <div style="background:${color};color:white;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:15px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3)">${emoji}</div>
      <div style="background:${color};color:white;border-radius:3px;padding:1px 4px;font-size:9px;font-weight:700;white-space:nowrap;max-width:72px;overflow:hidden;text-overflow:ellipsis">${name.split(' ')[0]}</div>
    </div>`,
    className: '',
    iconSize: [56, 48],
    iconAnchor: [28, 15],
  })
}

function posAtTime(positions: { lat: number; lon: number; timestamp: number }[], t: number) {
  if (!positions.length) return null
  let lo = 0, hi = positions.length - 1
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (positions[mid].timestamp <= t) lo = mid
    else hi = mid - 1
  }
  return positions[lo].timestamp <= t ? positions[lo] : null
}

function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  return h > 0
    ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

function formatAbsTime(ts: number) {
  return new Date(ts).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function Replay() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const sessionUuid = searchParams.get('session') ?? undefined

  const [trail, setTrail] = useState<TrailWithWaypoints | null>(null)
  const [data, setData] = useState<ReplayData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [currentTime, setCurrentTime] = useState(0) // ms from startTime
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(10)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const duration = data ? data.endTime - data.startTime : 0

  useEffect(() => {
    if (!id) return
    Promise.all([trailsApi.details(id), racesApi.replay(id, sessionUuid)])
      .then(([t, r]) => { setTrail(t.data); setData(r.data) })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id, sessionUuid])

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (!isPlaying || !duration) return
    intervalRef.current = setInterval(() => {
      setCurrentTime(prev => {
        const next = prev + speed * 100 // 100ms tick * speed factor
        if (next >= duration) { setIsPlaying(false); return duration }
        return next
      })
    }, 100)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isPlaying, speed, duration])

  if (loading) return (
    <div className="flex items-center justify-center h-[70vh]">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Cargando replay...</p>
      </div>
    </div>
  )

  if (error || !data) return (
    <div className="flex flex-col items-center justify-center h-[70vh] gap-4 px-6 text-center">
      <p className="text-slate-700 font-medium">No se pudo cargar el replay.</p>
      <button onClick={() => window.location.reload()} className="btn-primary text-sm py-2 px-4">Reintentar</button>
    </div>
  )

  if (!data.runners.length) return (
    <div className="flex flex-col items-center justify-center h-[70vh] gap-3 text-center px-6">
      <p className="text-slate-600 font-medium">No hay posiciones GPS registradas para esta sesión.</p>
      <p className="text-sm text-slate-400">El replay requiere datos de ubicación GPS enviados durante la carrera.</p>
      <Link to={`/races/${id}/results`} className="btn-ghost text-sm">Ver resultados</Link>
    </div>
  )

  const absTime = data.startTime + currentTime
  const center: [number, number] = trail?.waypoints?.[0]
    ? [trail.waypoints[0].lat, trail.waypoints[0].lon]
    : [-31.4167, -64.1833]

  // Compute current position for each runner
  const runnerPositions = data.runners.map(runner => ({
    runner,
    pos: posAtTime(runner.positions, absTime),
  }))

  const activeCount = runnerPositions.filter(r => r.pos !== null).length

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-slate-100 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center gap-3 flex-wrap">
          <Link to={`/races/${id}/results`} className="text-slate-400 hover:text-slate-600">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M5 12l7-7M5 12l7 7"/></svg>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-slate-900 text-sm truncate">{trail?.name} — Replay</h1>
            <p className="text-xs text-slate-400">
              {new Date(data.startTime).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              {' · '}{data.runners.length} corredor{data.runners.length !== 1 ? 'es' : ''}
            </p>
          </div>
          <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
            {formatAbsTime(absTime)} · {activeCount} activos
          </span>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer center={center} zoom={13} className="w-full h-full" zoomControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />

          {/* Trail route */}
          {trail?.waypoints && trail.waypoints.length > 1 && (
            <Polyline
              positions={trail.waypoints.map(w => [w.lat, w.lon] as [number, number])}
              color="#16a34a" weight={3} opacity={0.5}
            />
          )}

          {/* Waypoints */}
          {trail?.waypoints?.map((wp, i) => (
            <Circle key={wp.waypointUuid} center={[wp.lat, wp.lon]} radius={wp.radius || 50}
              color="#f59e0b" fillColor="#fef3c7" fillOpacity={0.4} weight={1.5}>
              <Popup><strong>{wp.name || `WP ${i + 1}`}</strong></Popup>
            </Circle>
          ))}

          {/* Runner markers */}
          {runnerPositions.map(({ runner, pos }) => {
            if (!pos) return null
            return (
              <Marker
                key={runner.userUuid}
                position={[pos.lat, pos.lon]}
                icon={runnerIcon(runner.userName, runner, true)}
              >
                <Popup>
                  <strong>{runner.userName}</strong><br />
                  {runner.teamName && <span className="text-slate-500 text-xs">{runner.teamName}<br /></span>}
                  <span className="text-xs text-slate-400">{formatAbsTime(pos.timestamp)}</span>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
      </div>

      {/* Controls */}
      <div className="flex-shrink-0 bg-white border-t border-slate-200 px-4 py-3 shadow-lg">
        <div className="max-w-3xl mx-auto space-y-2">
          {/* Slider */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-500 w-16 text-right flex-shrink-0">{formatDuration(currentTime)}</span>
            <input
              type="range" min={0} max={duration} step={1000}
              value={currentTime}
              onChange={e => { setIsPlaying(false); setCurrentTime(Number(e.target.value)) }}
              className="flex-1 accent-green-600"
            />
            <span className="text-xs font-mono text-slate-400 w-16 flex-shrink-0">{formatDuration(duration)}</span>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {/* Rewind */}
              <button
                onClick={() => { setIsPlaying(false); setCurrentTime(0) }}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                title="Ir al inicio"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 19l-7-7 7-7"/><path d="M18 19l-7-7 7-7"/></svg>
              </button>

              {/* Play / Pause */}
              <button
                onClick={() => setIsPlaying(p => !p)}
                className="p-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white transition-colors shadow-sm"
              >
                {isPlaying
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                }
              </button>

              {/* Skip to end */}
              <button
                onClick={() => { setIsPlaying(false); setCurrentTime(duration) }}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                title="Ir al final"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 19l7-7-7-7"/><path d="M6 19l7-7-7-7"/></svg>
              </button>
            </div>

            {/* Speed */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-medium">Velocidad:</span>
              <div className="flex gap-1">
                {SPEEDS.map(s => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`text-xs px-2 py-1 rounded-md font-semibold transition-colors ${
                      speed === s ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {s}×
                  </button>
                ))}
              </div>
            </div>

            {/* Runner count */}
            <span className="text-xs text-slate-400 hidden sm:block">
              {activeCount}/{data.runners.length} en pantalla
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
