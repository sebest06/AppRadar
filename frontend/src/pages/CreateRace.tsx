import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { trailsApi } from '../services/api'

interface WaypointDraft {
  order: number
  name: string
  lat: string
  lon: string
  radius: string
}

function parseGpx(text: string): WaypointDraft[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(text, 'application/xml')
  const points = Array.from(doc.querySelectorAll('trkpt, wpt, rtept'))
  if (points.length === 0) return []
  const step = Math.max(1, Math.floor(points.length / 20))
  return points
    .filter((_, i) => i % step === 0)
    .slice(0, 20)
    .map((pt, i) => ({
      order: i + 1,
      name: pt.querySelector('name')?.textContent ?? `WP ${i + 1}`,
      lat: pt.getAttribute('lat') ?? '',
      lon: pt.getAttribute('lon') ?? '',
      radius: '50',
    }))
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="card p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-slate-500 text-sm mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

export default function CreateRace() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({ name: '', description: '', distanceKm: '', elevationM: '', maxSkip: '1' })
  const [waypoints, setWaypoints] = useState<WaypointDraft[]>([
    { order: 1, name: 'Largada', lat: '', lon: '', radius: '50' },
    { order: 2, name: 'Meta', lat: '', lon: '', radius: '50' },
  ])
  const [gpxLoaded, setGpxLoaded] = useState(false)
  const [gpxName, setGpxName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const handleGpxFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const wps = parseGpx(text)
      if (wps.length > 0) { setWaypoints(wps); setGpxLoaded(true); setGpxName(file.name) }
      else setError('No se encontraron puntos en el GPX. Ingresá los waypoints manualmente.')
    }
    reader.readAsText(file)
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) handleGpxFile(f)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files?.[0]; if (f?.name.endsWith('.gpx')) handleGpxFile(f)
  }

  const updateWp = (i: number, k: keyof WaypointDraft, v: string) =>
    setWaypoints((p) => p.map((w, idx) => idx === i ? { ...w, [k]: v } : w))

  const addWp = () =>
    setWaypoints((p) => [...p, { order: p.length + 1, name: `WP ${p.length + 1}`, lat: '', lon: '', radius: '50' }])

  const removeWp = (i: number) =>
    setWaypoints((p) => p.filter((_, idx) => idx !== i).map((w, idx) => ({ ...w, order: idx + 1 })))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    const valid = waypoints.filter((w) => w.lat && w.lon)
    if (valid.length < 2) { setError('Necesitás al menos 2 waypoints con coordenadas completas.'); return }
    setLoading(true)
    try {
      await trailsApi.create({
        name: form.name, description: form.description,
        distanceKm: Number(form.distanceKm) || 0, elevationM: Number(form.elevationM) || 0,
        maxSkip: Number(form.maxSkip),
        waypoints: valid.map((w) => ({ order: w.order, name: w.name, lat: parseFloat(w.lat), lon: parseFloat(w.lon), radius: parseFloat(w.radius) || 50 })),
      })
      navigate('/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Error al crear la carrera')
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6">
        <Link to="/" className="text-slate-500 hover:text-slate-700 flex items-center gap-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M5 12l7-7M5 12l7 7"/></svg>
          Carreras
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-900 font-medium">Nueva carrera</span>
      </div>

      <h1 className="text-2xl font-bold text-slate-900 mb-6">Nueva carrera</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Información básica */}
        <SectionCard title="Información de la carrera">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre <span className="text-red-400">*</span></label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-base" placeholder="Ultra Sierras 2025" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Descripción</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="input-base resize-none"
                placeholder="Descripción del recorrido y condiciones..."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Distancia (km)', key: 'distanceKm', placeholder: '42.5', step: '0.1' },
                { label: 'Desnivel (m)', key: 'elevationM', placeholder: '2800' },
                { label: 'WP saltables', key: 'maxSkip', placeholder: '1', max: '5' },
              ].map(({ label, key, placeholder, step, max }) => (
                <div key={key}>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
                  <input
                    type="number"
                    step={step}
                    min="0"
                    max={max}
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="input-base"
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* Waypoints */}
        <SectionCard title="Waypoints" subtitle="Subí un GPX o ingresá las coordenadas manualmente">
          {/* Drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all mb-5 ${
              dragOver
                ? 'border-green-400 bg-green-50'
                : gpxLoaded
                ? 'border-green-300 bg-green-50'
                : 'border-slate-200 hover:border-green-300 hover:bg-slate-50'
            }`}
          >
            <input ref={fileRef} type="file" accept=".gpx" onChange={onFileChange} className="hidden" />
            {gpxLoaded ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-green-700 text-sm">{gpxName}</p>
                  <p className="text-green-600 text-xs">{waypoints.length} waypoints importados</p>
                </div>
                <button type="button" onClick={(e) => { e.stopPropagation(); setGpxLoaded(false); setWaypoints([{ order: 1, name: 'Largada', lat: '', lon: '', radius: '50' }, { order: 2, name: 'Meta', lat: '', lon: '', radius: '50' }]) }} className="text-slate-400 hover:text-slate-600 ml-auto">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ) : (
              <div>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-3">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="12" y2="12"/><line x1="15" y1="15" x2="12" y2="12"/>
                  </svg>
                </div>
                <p className="font-medium text-slate-700 text-sm">Arrastrá o hacé clic para subir un GPX</p>
                <p className="text-slate-400 text-xs mt-1">Los waypoints se importarán automáticamente</p>
              </div>
            )}
          </div>

          {/* Waypoint table — scrolls horizontally on mobile */}
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm min-w-[540px]">
              <thead>
                <tr className="text-xs text-slate-400 uppercase tracking-wide">
                  <th className="px-2 pb-2 text-center w-8">#</th>
                  <th className="px-2 pb-2 text-left">Nombre</th>
                  <th className="px-2 pb-2 text-left w-32">Latitud</th>
                  <th className="px-2 pb-2 text-left w-32">Longitud</th>
                  <th className="px-2 pb-2 text-left w-20">Radio (m)</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="space-y-1">
                {waypoints.map((wp, i) => (
                  <tr key={i} className="group">
                    <td className="px-2 py-1 text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        i === 0 ? 'bg-green-100 text-green-700' : i === waypoints.length - 1 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                      }`}>{wp.order}</span>
                    </td>
                    <td className="px-2 py-1">
                      <input value={wp.name} onChange={(e) => updateWp(i, 'name', e.target.value)} className="input-base py-1.5 text-sm" placeholder="Nombre" />
                    </td>
                    <td className="px-2 py-1">
                      <input value={wp.lat} onChange={(e) => updateWp(i, 'lat', e.target.value)} className="input-base py-1.5 text-sm font-mono" placeholder="-31.4167" />
                    </td>
                    <td className="px-2 py-1">
                      <input value={wp.lon} onChange={(e) => updateWp(i, 'lon', e.target.value)} className="input-base py-1.5 text-sm font-mono" placeholder="-64.1833" />
                    </td>
                    <td className="px-2 py-1">
                      <input value={wp.radius} onChange={(e) => updateWp(i, 'radius', e.target.value)} className="input-base py-1.5 text-sm" />
                    </td>
                    <td className="px-2 py-1">
                      <button
                        type="button"
                        onClick={() => removeWp(i)}
                        disabled={waypoints.length <= 2}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 disabled:opacity-0 transition-all"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={addWp}
            className="mt-3 flex items-center gap-1.5 text-sm font-medium text-green-600 hover:text-green-700 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Agregar waypoint
          </button>
        </SectionCard>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end">
          <Link to="/" className="btn-ghost text-center">Cancelar</Link>
          <button type="submit" disabled={loading} className="btn-primary px-8">
            {loading ? (
              <>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25"/>
                  <path d="M21 12a9 9 0 00-9-9"/>
                </svg>
                Creando...
              </>
            ) : 'Crear carrera'}
          </button>
        </div>
      </form>
    </div>
  )
}
