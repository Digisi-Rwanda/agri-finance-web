import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell,
  CircleHelp,
  FileCheck2,
  HandCoins,
  Home,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Shield,
  User,
  Wallet,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { clearSession, getCurrentUser, hydrateSessionUser } from '../services/auth'
import ThemeSwitch from '../components/layout/ThemeSwitch'
import { PortalThemeContext } from '../context/PortalThemeContext'
import { getUserInitials, ROLE_LABELS } from '../utils/roles'

const navItemsByRole = {
  BANK: [
    { to: '/', label: 'Home', icon: Home },
    { to: '/loans', label: 'Loan Management', icon: HandCoins },
    { to: '/payments', label: 'MoMo Payments', icon: Wallet },
    { to: '/farmer', label: 'Farmer Analysis', icon: FileCheck2 },
  ],
  INSURER: [
    { to: '/insurer', label: 'Home', icon: Home },
    { to: '/insurance', label: 'Insurance Management', icon: Shield },
    { to: '/payments', label: 'MoMo Payments', icon: Wallet },
  ],
  ADMIN: [
    { to: '/', label: 'Home', icon: Home },
    { to: '/loans', label: 'Loan Management', icon: HandCoins },
    { to: '/insurance', label: 'Insurance Management', icon: Shield },
    { to: '/payments', label: 'MoMo Payments', icon: Wallet },
    { to: '/farmer', label: 'Farmer Analysis', icon: FileCheck2 },
    { to: '/admin', label: 'Admin', icon: User },
    { to: '/audit', label: 'Audit Logs', icon: CircleHelp },
  ],
  FARMER: [
    { to: '/payments', label: 'MoMo Payments', icon: Wallet },
    { to: '/consent', label: 'Consent Management', icon: Settings },
  ],
}

// Page title shown in the header for each route.
const PAGE_TITLES = {
  '/': 'Dashboard',
  '/loans': 'Loan Management',
  '/payments': 'MoMo Payments',
  '/farmer': 'Farmer Analysis',
  '/insurer': 'Insurer Dashboard',
  '/insurance': 'Insurance Management',
  '/admin': 'Admin Panel',
  '/audit': 'Audit Logs',
  '/consent': 'Consent Management',
  '/notifications': 'Notifications',
}

function getPageTitle(pathname) {
  if (pathname.startsWith('/farmer/')) return 'Farmer Profile'
  return PAGE_TITLES[pathname] || 'Portal'
}

function MainLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') !== 'light')
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const currentRole = getCurrentUser()?.role || 'BANK'
  const navItems = navItemsByRole[currentRole] || navItemsByRole.BANK
  const user = getCurrentUser()
  const userInitials = getUserInitials(user)
  const roleLabel = ROLE_LABELS[currentRole] || currentRole
  const [searchQuery, setSearchQuery] = useState('')
  const pageTitle = useMemo(() => getPageTitle(location.pathname), [location.pathname])

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    const query = searchQuery.trim()
    if (!query) return
    navigate('/farmer', { state: { search: query } })
    setSearchQuery('')
  }

  const handleLogout = () => setShowLogoutModal(true)

  const confirmLogout = () => {
    clearSession()
    navigate('/login', { replace: true })
  }

  useEffect(() => {
    hydrateSessionUser().catch(() => {})
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  const shellThemeClass = darkMode ? 'neon-dashboard' : 'portal-light'

  return (
    <PortalThemeContext.Provider value={{ isDark: darkMode }}>
    <div className={`app-shell ${shellThemeClass}`}>
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <Link to="/" className="brand" onClick={() => setMenuOpen(false)}>
          Agri Trust
        </Link>
        <span className="brand-sub">Institutional portal</span>
        <nav>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          {(currentRole === 'FARMER' || currentRole === 'ADMIN') && (
            <NavLink
              to="/consent"
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              <Settings size={16} />
              Settings
            </NavLink>
          )}
        </div>
      </aside>

      <div className="content-shell">
        <header className="topbar">
          {/* Left: menu + current page */}
          <div className="topbar__start">
            <button
              type="button"
              className="topbar-icon mobile-only"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div className="topbar__heading">
              <span className="topbar__eyebrow">Agri Trust</span>
              <h1 className="topbar__title">{pageTitle}</h1>
            </div>
          </div>

          {/* Center: search */}
          <form className="topbar__search" onSubmit={handleSearchSubmit}>
            <Search size={14} className="topbar__search-icon" aria-hidden />
            <input
              type="search"
              placeholder="Search…"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              aria-label="Search farmers"
            />
          </form>

          {/* Right: tools + profile */}
          <div className="topbar__end">
            <div className="topbar__tools">
              <ThemeSwitch isDark={darkMode} onChange={setDarkMode} />
              <button
                type="button"
                className="topbar-icon topbar-icon--notify"
                onClick={() => navigate('/notifications')}
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell size={16} />
                <span className="topbar-icon__dot" aria-hidden />
              </button>
            </div>

            <div className="topbar__profile">
              <span className="topbar-avatar" title={user?.username || 'User'}>
                {userInitials}
              </span>
              <div className="topbar-user__meta">
                <strong>{user?.fullName || user?.username || 'User'}</strong>
                <small>{roleLabel}</small>
              </div>
              <button
                type="button"
                className="topbar-icon topbar-icon--logout"
                onClick={handleLogout}
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </header>

        <main className="main-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {showLogoutModal && (
        <div className="confirm-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="confirm-card" onClick={(event) => event.stopPropagation()}>
            <h3>Sign out?</h3>
            <p>You will leave the institutional portal. Unsaved changes may be lost.</p>
            <div className="confirm-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowLogoutModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn-danger" onClick={confirmLogout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </PortalThemeContext.Provider>
  )
}

export default MainLayout
