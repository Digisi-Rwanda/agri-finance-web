import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell,
  ChevronDown,
  CreditCard,
  Home,
  Landmark,
  LogOut,
  Menu,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  User,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { clearSession, getCurrentUser, hydrateSessionUser } from '../services/auth'
import ThemeSwitch from '../components/layout/ThemeSwitch'
import { PortalThemeContext } from '../context/PortalThemeContext'
import { getHomePathForRole, getUserInitials, ROLE_LABELS } from '../utils/roles'

const navSectionsByRole = {
  BANK: [
    {
      id: 'dashboard',
      title: 'Dashboard',
      single: true,
      items: [{ to: '/', label: 'Dashboard', icon: Home, end: true }],
    },
    {
      id: 'operations',
      title: 'Operations',
      items: [
        { to: '/farmer', label: 'Farmers', icon: UserRound },
        { to: '/loans', label: 'Loans', icon: Landmark },
        { to: '/payments', label: 'Payments', icon: CreditCard },
      ],
    },
  ],
  INSURER: [
    {
      id: 'dashboard',
      title: 'Dashboard',
      single: true,
      items: [{ to: '/insurer', label: 'Dashboard', icon: Home, end: true }],
    },
    {
      id: 'operations',
      title: 'Operations',
      items: [
        { to: '/insurance', label: 'Insurance', icon: ShieldCheck },
        { to: '/payments', label: 'Payments', icon: CreditCard },
      ],
    },
  ],
  ADMIN: [
    {
      id: 'dashboard',
      title: 'Dashboard',
      single: true,
      items: [{ to: '/', label: 'Dashboard', icon: Home, end: true }],
    },
    {
      id: 'operations',
      title: 'Operations',
      items: [
        { to: '/farmer', label: 'Farmers', icon: UserRound },
        { to: '/loans', label: 'Loans', icon: Landmark },
        { to: '/payments', label: 'Payments', icon: CreditCard },
        { to: '/insurance', label: 'Insurance', icon: ShieldCheck },
      ],
    },
    {
      id: 'system',
      title: 'System',
      items: [
        { to: '/admin', label: 'Users', icon: Users },
        { to: '/audit', label: 'Audit Logs', icon: ScrollText },
      ],
    },
  ],
  FARMER: [
    {
      id: 'dashboard',
      title: 'Dashboard',
      single: true,
      items: [{ to: '/payments', label: 'Dashboard', icon: Home, end: true }],
    },
    {
      id: 'account',
      title: 'Account',
      items: [
        { to: '/profile', label: 'My profile', icon: User },
        { to: '/settings', label: 'Settings', icon: Settings },
      ],
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
  '/admin': 'Users',
  '/audit': 'Audit Logs',
  '/consent': 'Settings',
  '/profile': 'My profile',
  '/settings': 'Settings',
  '/notifications': 'Notifications',
}

const SEARCH_CONFIG = {
  '/farmer': { placeholder: 'Search farmers…', target: '/farmer', label: 'Search farmers' },
  '/loans': { placeholder: 'Search loans…', target: '/loans', label: 'Search loans' },
  '/payments': { placeholder: 'Search transactions…', target: '/payments', label: 'Search transactions' },
  default: { placeholder: 'Search farmers…', target: '/farmer', label: 'Search farmers' },
}

function getPageTitle(pathname) {
  if (pathname.startsWith('/farmer/')) return 'Farmer Profile'
  return PAGE_TITLES[pathname] || 'Portal'
}

function getBreadcrumbs(pathname, homePath) {
  const crumbs = [{ label: 'Home', to: homePath }]

  if (pathname === '/' || pathname === '/insurer' || (pathname === '/payments' && homePath === '/payments')) {
    crumbs.push({ label: 'Dashboard' })
    return crumbs
  }

  if (pathname.startsWith('/farmer/')) {
    crumbs.push({ label: 'Farmers', to: '/farmer' })
    crumbs.push({ label: 'Farmer Profile' })
    return crumbs
  }

  if (pathname === '/profile') {
    crumbs.push({ label: 'My profile' })
    return crumbs
  }

  if (pathname === '/settings' || pathname === '/consent') {
    crumbs.push({ label: 'Settings' })
    return crumbs
  }

  const title = PAGE_TITLES[pathname]
  if (title) crumbs.push({ label: title })
  return crumbs
}

function getSearchConfig(pathname) {
  if (pathname.startsWith('/farmer')) return SEARCH_CONFIG['/farmer']
  if (pathname.startsWith('/loans')) return SEARCH_CONFIG['/loans']
  if (pathname.startsWith('/payments')) return SEARCH_CONFIG['/payments']
  return SEARCH_CONFIG.default
}

function sectionContainsPath(section, pathname) {
  return section.items.some((item) => {
    if (item.end) return pathname === item.to
    if (item.to === '/') return pathname === '/'
    return pathname === item.to || pathname.startsWith(`${item.to}/`)
  })
}

function defaultSectionOpen(section, pathname) {
  return sectionContainsPath(section, pathname) || section.id === 'operations'
}

function MainLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const profileRef = useRef(null)

  const [menuOpen, setMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark')
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [menuOverrides, setMenuOverrides] = useState({})
  const [searchQuery, setSearchQuery] = useState('')
  const [routePath, setRoutePath] = useState(location.pathname)

  // Adjust UI state during render when the route changes (avoids setState-in-effect).
  if (location.pathname !== routePath) {
    setRoutePath(location.pathname)
    setMenuOpen(false)
    setProfileOpen(false)
    setMenuOverrides({})
  }

  const currentRole = getCurrentUser()?.role || 'BANK'
  const navSections = navSectionsByRole[currentRole] || navSectionsByRole.BANK
  const canSearch = currentRole === 'BANK' || currentRole === 'ADMIN'
  const user = getCurrentUser()
  const userInitials = getUserInitials(user)
  const roleLabel = ROLE_LABELS[currentRole] || currentRole
  const homePath = getHomePathForRole(currentRole)
  const pageTitle = useMemo(() => getPageTitle(location.pathname), [location.pathname])
  const breadcrumbs = useMemo(
    () => getBreadcrumbs(location.pathname, homePath),
    [location.pathname, homePath],
  )
  const searchConfig = useMemo(() => getSearchConfig(location.pathname), [location.pathname])
  const settingsPath = '/settings'

  const isSectionOpen = (section) => {
    if (menuOverrides[section.id] !== undefined) return menuOverrides[section.id]
    return defaultSectionOpen(section, location.pathname)
  }

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    const query = searchQuery.trim()
    if (!query) return
    navigate(searchConfig.target, { state: { search: query } })
    setSearchQuery('')
  }

  const handleLogout = () => {
    setProfileOpen(false)
    setShowLogoutModal(true)
  }

  const confirmLogout = () => {
    clearSession()
    navigate('/login', { replace: true })
  }

  const toggleMenu = (section) => {
    const currentlyOpen = isSectionOpen(section)
    setMenuOverrides((prev) => ({ ...prev, [section.id]: !currentlyOpen }))
  }

  useEffect(() => {
    hydrateSessionUser().catch(() => {})
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!profileRef.current?.contains(event.target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  const shellThemeClass = darkMode ? 'neon-dashboard' : 'portal-light'

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
            if (section.single) {
              const item = section.items[0]
              return (
                <NavLink
                  key={section.id}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                >
                  <item.icon size={16} />
                  {item.label}
                </NavLink>
              )
            }

            const isOpen = isSectionOpen(section)
            const sectionActive = sectionContainsPath(section, location.pathname)

            return (
              <div
                className={`nav-dropdown${isOpen ? ' open' : ''}${sectionActive ? ' has-active' : ''}`}
                key={section.id}
              >
                <button
                  type="button"
                  className="nav-dropdown__toggle"
                  onClick={() => toggleMenu(section)}
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
              <nav className="topbar-breadcrumb" aria-label="Breadcrumb">
                {breadcrumbs.map((crumb, index) => {
                  const isLast = index === breadcrumbs.length - 1
                  return (
                    <span key={`${crumb.label}-${index}`} className="topbar-breadcrumb__item">
                      {index > 0 ? <span className="topbar-breadcrumb__sep">›</span> : null}
                      {crumb.to && !isLast ? (
                        <Link to={crumb.to}>{crumb.label}</Link>
                      ) : (
                        <span aria-current={isLast ? 'page' : undefined}>{crumb.label}</span>
                      )}
                    </span>
                  )
                })}
              </nav>
              <h1 className="topbar__title">{pageTitle}</h1>
            </div>
          </div>

          {canSearch ? (
            <form className="topbar__search" onSubmit={handleSearchSubmit}>
              <Search size={14} className="topbar__search-icon" aria-hidden />
              <input
                type="search"
                placeholder={searchConfig.placeholder}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                aria-label={searchConfig.label}
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
                className="topbar-icon"
                onClick={() => navigate('/notifications')}
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell size={16} />
              </button>
            </div>

            <div className={`topbar__profile-menu${profileOpen ? ' open' : ''}`} ref={profileRef}>
              <button
                type="button"
                className="topbar-profile-trigger"
                onClick={() => setProfileOpen((prev) => !prev)}
                aria-expanded={profileOpen}
                aria-haspopup="menu"
              >
                <span className="topbar-avatar" aria-hidden>
                  {userInitials}
                </span>
                <div className="topbar-user__meta">
                  <strong>{user?.fullName || user?.username || 'User'}</strong>
                  <small>{roleLabel}</small>
                </div>
                <ChevronDown size={14} className="topbar-profile-trigger__chevron" aria-hidden />
              </button>

              {profileOpen ? (
                <div className="profile-dropdown" role="menu">
                  <div className="profile-dropdown__head">
                    <strong>{user?.fullName || user?.username || 'User'}</strong>
                    <small>{roleLabel}</small>
                  </div>
                  <button
                    type="button"
                    className="profile-dropdown__item"
                    role="menuitem"
                    onClick={() => {
                      setProfileOpen(false)
                      navigate('/profile')
                    }}
                  >
                    <User size={15} />
                    Profile
                  </button>
                  <button
                    type="button"
                    className="profile-dropdown__item"
                    role="menuitem"
                    onClick={() => {
                      setProfileOpen(false)
                      navigate(settingsPath)
                    }}
                  >
                    <Settings size={15} />
                    Settings
                  </button>
                  <button
                    type="button"
                    className="profile-dropdown__item profile-dropdown__item--danger"
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    <LogOut size={15} />
                    Logout
                  </button>
                </div>
              ) : null}
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
