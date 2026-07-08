import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell,
  ChevronDown,
  CircleHelp,
  FileCheck2,
  HandCoins,
  Home,
  LogOut,
  Menu,
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

const navSectionsByRole = {
  BANK: [
    {
      id: 'overview',
      title: 'Overview',
      items: [{ to: '/', label: 'Dashboard', icon: Home, end: true }],
    },
    {
      id: 'management',
      title: 'Management',
      items: [
        { to: '/farmer', label: 'Farmers', icon: FileCheck2 },
        { to: '/loans', label: 'Loans', icon: HandCoins },
        { to: '/payments', label: 'Payments', icon: Wallet },
      ],
    },
  ],
  INSURER: [
    {
      id: 'overview',
      title: 'Overview',
      items: [{ to: '/insurer', label: 'Dashboard', icon: Home, end: true }],
    },
    {
      id: 'management',
      title: 'Management',
      items: [
        { to: '/insurance', label: 'Insurance', icon: Shield },
        { to: '/payments', label: 'Payments', icon: Wallet },
      ],
    },
  ],
  ADMIN: [
    {
      id: 'overview',
      title: 'Overview',
      items: [{ to: '/', label: 'Dashboard', icon: Home, end: true }],
    },
    {
      id: 'management',
      title: 'Management',
      items: [
        { to: '/farmer', label: 'Farmers', icon: FileCheck2 },
        { to: '/loans', label: 'Loans', icon: HandCoins },
        { to: '/payments', label: 'Payments', icon: Wallet },
        { to: '/insurance', label: 'Insurance', icon: Shield },
      ],
    },
    {
      id: 'admin',
      title: 'Administration',
      items: [
        { to: '/admin', label: 'Admin Panel', icon: User },
        { to: '/audit', label: 'Audit Logs', icon: CircleHelp },
        { to: '/consent', label: 'Consent settings', icon: Settings },
      ],
    },
  ],
  FARMER: [
    {
      id: 'overview',
      title: 'Overview',
      items: [{ to: '/payments', label: 'Dashboard', icon: Home, end: true }],
    },
    {
      id: 'account',
      title: 'Account',
      items: [{ to: '/consent', label: 'Consent & Settings', icon: Settings }],
    },
  ],
}

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/loans': 'Loans',
  '/payments': 'Payments',
  '/farmer': 'Farmers',
  '/insurer': 'Dashboard',
  '/insurance': 'Insurance',
  '/admin': 'Admin Panel',
  '/audit': 'Audit Logs',
  '/consent': 'Consent & Settings',
  '/notifications': 'Notifications',
}

function getPageTitle(pathname) {
  if (pathname.startsWith('/farmer/')) return 'Farmer Profile'
  return PAGE_TITLES[pathname] || 'Portal'
}

function sectionContainsPath(section, pathname) {
  return section.items.some((item) => {
    if (item.end) return pathname === item.to
    if (item.to === '/') return pathname === '/'
    return pathname === item.to || pathname.startsWith(`${item.to}/`)
  })
}

function MainLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') !== 'light')
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [openMenus, setOpenMenus] = useState(() => {
    const initial = {}
    Object.values(navSectionsByRole).flat().forEach((section) => {
      initial[section.id] = section.id === 'overview' || section.id === 'management'
    })
    return initial
  })
  const location = useLocation()
  const navigate = useNavigate()
  const currentRole = getCurrentUser()?.role || 'BANK'
  const navSections = navSectionsByRole[currentRole] || navSectionsByRole.BANK
  const canSearchFarmers = currentRole === 'BANK' || currentRole === 'ADMIN'
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

  const toggleMenu = (sectionId) => {
    setOpenMenus((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }

  useEffect(() => {
    hydrateSessionUser().catch(() => {})
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    setOpenMenus((prev) => {
      const next = { ...prev }
      navSections.forEach((section) => {
        if (sectionContainsPath(section, location.pathname)) {
          next[section.id] = true
        } else if (next[section.id] === undefined) {
          next[section.id] = section.id === 'overview'
        }
      })
      return next
    })
  }, [location.pathname, currentRole])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  const shellThemeClass = darkMode ? 'neon-dashboard' : 'portal-light'
  const homePath = currentRole === 'INSURER' ? '/insurer' : currentRole === 'FARMER' ? '/payments' : '/'

  return (
    <PortalThemeContext.Provider value={{ isDark: darkMode }}>
    <div className={`app-shell ${shellThemeClass}`}>
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <Link to={homePath} className="brand" onClick={() => setMenuOpen(false)}>
          Agri Trust
        </Link>
        <span className="brand-sub">Institutional portal</span>
        <nav className="sidebar-nav">
          {navSections.map((section) => {
            const isOpen = Boolean(openMenus[section.id])
            const sectionActive = sectionContainsPath(section, location.pathname)

            return (
              <div
                className={`nav-dropdown${isOpen ? ' open' : ''}${sectionActive ? ' has-active' : ''}`}
                key={section.id}
              >
                <button
                  type="button"
                  className="nav-dropdown__toggle"
                  onClick={() => toggleMenu(section.id)}
                  aria-expanded={isOpen}
                >
                  <span>{section.title}</span>
                  <ChevronDown size={15} className="nav-dropdown__chevron" aria-hidden />
                </button>
                {isOpen ? (
                  <div className="nav-dropdown__panel">
                    {section.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={() => setMenuOpen(false)}
                        className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                      >
                        <item.icon size={16} />
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                ) : null}
              </div>
            )
          })}
        </nav>
        <div className="sidebar-footer">
          <button type="button" className="nav-link nav-link--logout" onClick={handleLogout}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {menuOpen ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <div className="content-shell">
        <header className="topbar">
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

          {canSearchFarmers ? (
            <form className="topbar__search" onSubmit={handleSearchSubmit}>
              <Search size={14} className="topbar__search-icon" aria-hidden />
              <input
                type="search"
                placeholder="Search farmers by name or ID…"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                aria-label="Search farmers"
              />
            </form>
          ) : (
            <div className="topbar__search topbar__search--placeholder" aria-hidden />
          )}

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
