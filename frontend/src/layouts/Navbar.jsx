import { useMemo, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import Button from '../components/Button'
import NotificationPanel from '../components/NotificationPanel'
import ProfilePanel from '../components/ProfilePanel'
import ThemeToggle from '../components/ThemeToggle'
import useAuth from '../hooks/useAuth'
import { ROLES, normalizeRole } from '../utils/roles'

function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const { isAuthenticated, logout, user } = useAuth()

  const navItems = useMemo(() => {
    const role = normalizeRole(user?.role)

    if (!isAuthenticated) {
      return [{ label: 'Auctions', to: '/auctions' }]
    }

    if (role === ROLES.admin) {
      return [
        { label: 'Auctions', to: '/auctions' },
        { label: 'Admin Panel', to: '/admin' },
      ]
    }

    if (role === ROLES.defender) {
      return [
        { label: 'Auctions', to: '/auctions' },
        { label: 'Defender Dashboard', to: '/defender' },
      ]
    }

    if (role === ROLES.seller) {
      return [
        { label: 'Auctions', to: '/auctions' },
        { label: 'Watchlist', to: '/watchlist' },
        { label: 'Create Auction', to: '/seller/create' },
      ]
    }

    return [
      { label: 'Auctions', to: '/auctions' },
      { label: 'Watchlist', to: '/watchlist' },
    ]
  }, [isAuthenticated, user?.role])

  const linkClass = ({ isActive }) =>
    `whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition duration-200 ${
      isActive
        ? 'bg-white text-violet-700 shadow-sm dark:bg-slate-800 dark:text-violet-300'
        : 'text-slate-600 hover:bg-white/80 hover:text-app-text dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
    }`

  const closeMenu = () => setIsOpen(false)

  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-app-bg/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/85">
      <nav className="mx-auto grid max-w-7xl grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 sm:px-6 lg:grid-cols-[1fr_auto_1fr] lg:px-8">
        <Link to="/" className="flex min-w-0 items-center gap-3" onClick={closeMenu}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary text-lg font-black text-white shadow-subtle">
            A
          </span>
          <span className="min-w-0">
            <span className="block text-lg font-black tracking-normal text-app-text dark:text-white">Argex</span>
            <span className="hidden text-xs font-medium text-slate-500 dark:text-slate-400 sm:block">
              Secure auction intelligence
            </span>
          </span>
        </Link>

        <div className="hidden max-w-full items-center gap-1 overflow-x-auto rounded-full border border-white/80 bg-white/50 p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 lg:flex">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass}>
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden items-center justify-end gap-2 lg:flex">
          <ThemeToggle />
          {isAuthenticated ? (
            <>
              <NotificationPanel />
              <ProfilePanel />
              <Button variant="secondary" onClick={logout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button as={Link} to="/login" variant="ghost">
                Sign in
              </Button>
              <Button as={Link} to="/register" variant="primary">
                Create account
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 lg:hidden">
          <ThemeToggle />
          {isAuthenticated ? <NotificationPanel /> : null}
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-app-text shadow-sm transition hover:border-primary hover:text-violet-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            aria-label="Toggle navigation"
            aria-expanded={isOpen}
            onClick={() => setIsOpen((current) => !current)}
          >
            <span className="text-xl leading-none">{isOpen ? 'x' : '≡'}</span>
          </button>
        </div>
      </nav>

      {isOpen ? (
        <div className="border-t border-white/70 bg-app-bg px-4 pb-4 dark:border-slate-800 dark:bg-slate-950 lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 pt-3">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClass} onClick={closeMenu}>
                {item.label}
              </NavLink>
            ))}
            {isAuthenticated ? (
              <div className="mt-2 rounded-2xl border border-white/80 bg-white/80 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <ProfilePanel compact onNavigate={closeMenu} />
                <Button
                  className="mt-3 w-full"
                  variant="secondary"
                  onClick={() => {
                    logout()
                    closeMenu()
                  }}
                >
                  Logout
                </Button>
              </div>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-3">
                <Button as={Link} to="/login" variant="secondary" onClick={closeMenu}>
                  Sign in
                </Button>
                <Button as={Link} to="/register" variant="primary" onClick={closeMenu}>
                  Join
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </header>
  )
}

export default Navbar
