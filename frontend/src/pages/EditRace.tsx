import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { trailsApi } from '../services/api'

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5 sm:p-6">
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">{title}</h2>
      {children}
    </div>
  )
}

export default function EditRace() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [form, setForm] = useState({ name: '', description: '', distanceKm: '', elevationM: '', maxSkip: '1' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    trailsApi.details(id)
      .then(r => {
        const t = r.data
        setForm({
          name: t.name,
          description: t.description ?? '',
          distanceKm: t.distanceKm > 0 ? String(t.distanceKm) : '',
          elevationM: t.elevationM > 0 ? String(t.elevationM) : '',
          maxSkip: String(t.maxSkip ?? 1),
        })
      })
      .catch(() => setError('No se pudo cargar la carrera.'))
      .finally(() => setLoading(false))
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('El nombre es requerido.'); return }
    setError(''); setSaving(true)
    try {
      await trailsApi.update(id!, {
        name: form.name.trim(),
        description: form.description,
        distanceKm: Number(form.distanceKm) || 0,
        elevationM: Number(form.elevationM) || 0,
        maxSkip: Number(form.maxSkip) || 1,
      })
      navigate('/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Error al guardar los cambios.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error && !form.name) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 px-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
        </div>
        <p className="text-slate-700 font-medium">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary text-sm py-2 px-4">Reintentar</button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="flex items-center gap-2 text-sm mb-6">
        <Link to="/" className="text-slate-500 hover:text-slate-700 flex items-center gap-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M5 12l7-7M5 12l7 7"/></svg>
          Carreras
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-900 font-medium truncate">{form.name}</span>
      </div>

      <h1 className="text-2xl font-bold text-slate-900 mb-6">Editar carrera</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <SectionCard title="Información de la carrera">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Nombre <span className="text-red-400">*</span>
              </label>
              <input
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="input-base"
                placeholder="Ultra Sierras 2025"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Descripción</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="input-base resize-none"
                placeholder="Descripción del recorrido y condiciones..."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Distancia (km)', key: 'distanceKm', placeholder: '42.5', step: '0.1' },
                { label: 'Desnivel (m)', key: 'elevationM', placeholder: '2800', step: '1' },
                { label: 'WP saltables', key: 'maxSkip', placeholder: '1', step: '1', max: '5' },
              ].map(({ label, key, placeholder, step, max }) => (
                <div key={key}>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
                  <input
                    type="number"
                    step={step}
                    min="0"
                    max={max}
                    value={form[key as keyof typeof form]}
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                    className="input-base"
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          <Link to="/" className="btn-ghost">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
