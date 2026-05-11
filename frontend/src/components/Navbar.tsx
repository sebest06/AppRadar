import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

function NavLink({ to, children, onClick }: { to: string; children: React.ReactNode; onClick?: () => void }) {
  const { pathname } = useLocation()
  const active = pathname === to
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
        active
          ? 'bg-white/15 text-white'
          : 'text-green-100 hover:text-white hover:bg-white/10'
      }`}
    >
      {children}
    </Link>
  )
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
  return (
    <div className="w-8 h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-xs font-bold text-white select-none">
      {initials}
    </div>
  )
}

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
    setOpen(false)
  }

  const close = () => setOpen(false)

  return (
    <>
      <nav
        className="sticky top-0 z-50 shadow-md"
        style={{ background: 'linear-gradient(135deg, #166534 0%, #15803d 100%)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 text-white font-bold text-lg" onClick={close}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 17l4-8 4 4 3-6 4 10" />
                <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none" />
              </svg>
              AppRadar
            </Link>

            {/* Desktop nav */}
            {user && (
              <div className="hidden sm:flex items-center gap-1">
                <NavLink to="/">Carreras</NavLink>
                {user.role === 'organizer' && (
                  <NavLink to="/races/new">+ Nueva carrera</NavLink>
                )}
              </div>
            )}

            {/* Desktop right */}
            <div className="hidden sm:flex items-center gap-3">
              {user ? (
                <>
                  <div className="flex items-center gap-2 text-green-100 text-sm">
                    <Avatar name={user.nombre} />
                    <span className="hidden md:block">{user.nombre}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-green-200 hover:text-white border border-white/20 hover:border-white/40 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Salir
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-sm text-green-100 hover:text-white font-medium">
                    Ingresar
                  </Link>
                  <Link
                    to="/register"
                    className="text-sm bg-white text-green-700 hover:bg-green-50 font-semibold px-4 py-1.5 rounded-lg transition-colors shadow-sm"
                  >
                    Registrarse
                  </Link>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              className="sm:hidden p-2 text-white rounded-lg hover:bg-white/10 transition-colors"
              onClick={() => setOpen((o) => !o)}
              aria-label="Menú"
            >
              {open ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="sm:hidden border-t border-white/15 px-4 py-3 space-y-1 pb-safe" style={{ background: '#166534' }}>
            {user ? (
              <>
                <div className="flex items-center gap-3 px-3 py-2 mb-2">
                  <Avatar name={user.nombre} />
                  <div>
                    <p className="text-white text-sm font-semibold">{user.nombre}</p>
                    <p className="text-green-200 text-xs">{user.team}</p>
                  </div>
                </div>
                <NavLink to="/" onClick={close}>Carreras</NavLink>
                {user.role === 'organizer' && (
                  <NavLink to="/races/new" onClick={close}>+ Nueva carrera</NavLink>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full text-left text-sm text-red-300 hover:text-red-200 px-3 py-2 mt-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" onClick={close}>Ingresar</NavLink>
                <NavLink to="/register" onClick={close}>Registrarse</NavLink>
              </>
            )}
          </div>
        )}
      </nav>
    </>
  )
}
