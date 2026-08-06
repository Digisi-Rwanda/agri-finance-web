import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell,
  Briefcase,
  ClipboardCheck,
  CreditCard,
  Eye,
  FileKey,
  Home,
  Landmark,
  Layers,
  LogOut,
  Menu,
  MoreHorizontal,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  User,
  UserRound,
  Users,
  Warehouse,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { clearSession, getCurrentUser, hydrateSessionUser } from '../services/auth'
import ThemeSwitch from '../components/layout/ThemeSwitch'
import { PortalThemeContext } from '../context/PortalThemeContext'
import { getHomePathForRole } from '../utils/roles'

const navItemsByRole = {
  BANK: [
    { to: '/', label: 'Home', icon: Home, end: true },
    { to: '/farmer', label: 'Farmers', icon: UserRound },
    { to: '/loans', label: 'Loans', icon: Landmark },
    { to: '/loan-packages', label: 'Loan products', icon: ClipboardCheck },
    { to: '/payments', label: 'Payments', icon: CreditCard },
  ],
  INSURER: [
    { to: '/insurer', label: 'Home', icon: Home, end: true },
    { to: '/insurance', label: 'Insurance', icon: ShieldCheck },
    { to: '/payments', label: 'Payments', icon: CreditCard },
  ],
  ADMIN: [
    { to: '/', label: 'Home', icon: Home, end: true },
    { to: '/farmer', label: 'Farmers', icon: UserRound },
    { to: '/loans', label: 'Loans', icon: Landmark },
    { to: '/loan-packages', label: 'Packages', icon: ClipboardCheck },
    { to: '/contracts', label: 'Receivables', icon: Briefcase },
    { to: '/inspections', label: 'Inspections', icon: ClipboardCheck },
    { to: '/payment-watch', label: 'Payment Watch', icon: Eye },
    { to: '/payments', label: 'Payments', icon: CreditCard },
    { to: '/admin', label: 'Users', icon: Users },
    { to: '/admin/reports', label: 'Reports', icon: ScrollText },
  ],
  FARMER: [
    { to: '/payments', label: 'Home', icon: Home, end: true },
  ],
  COOPERATIVE: [
    { to: '/', label: 'Home', icon: Home, end: true },
  ],
  INSPECTOR: [
    { to: '/', label: 'Home', icon: Home, end: true },
  ],
  GUARANTEE_OFFICER: [
    { to: '/bankability/v2', label: 'Guarantees', icon: ShieldCheck, end: true },
    { to: '/bankability', label: 'Claims', icon: Warehouse },
    { to: '/payment-watch', label: 'Payment Watch', icon: Eye },
    { to: '/consent-vault', label: 'Consent Vault', icon: FileKey },
    { to: '/trust-ladder', label: 'Trust Ladder', icon: Layers },
    { to: '/contracts', label: 'Receivables', icon: Briefcase },
  ],
  REGISTRATION_OFFICER: [
    { to: '/admin/reports', label: 'Home', icon: Home, end: true },
    { to: '/farmer', label: 'Farmers', icon: UserRound },
    { to: '/loans', label: 'Loans', icon: Landmark },
    { to: '/contracts', label: 'Receivables', icon: Briefcase },
    { to: '/consent-vault', label: 'Consent Vault', icon: FileKey },
    { to: '/insurance', label: 'Insurance', icon: ShieldCheck },
    { to: '/payments', label: 'Payments', icon: CreditCard },
  ],
}

const moreItemsByRole = {
  BANK: [
    { to: '/contracts', label: 'Receivables', icon: Briefcase },
    { to: '/payment-watch', label: 'Remittances', icon: Eye },
    { to: '/consent-vault', label: 'Farmer consent', icon: FileKey },
    { to: '/trust-ladder', label: 'Credit tiers', icon: Layers },
  ],
  ADMIN: [
    { to: '/consent-vault', label: 'Farmer consent', icon: FileKey },
    { to: '/trust-ladder', label: 'Credit tiers', icon: Layers },
    { to: '/bankability', label: 'Warehouse claims', icon: Warehouse },
    { to: '/bankability/v2', label: 'Guarantees', icon: ShieldCheck },
    { to: '/cooperative', label: 'Cooperative', icon: Warehouse },
    { to: '/insurance', label: 'Insurance', icon: ShieldCheck },
    { to: '/audit', label: 'Audit Logs', icon: FileKey },
  ],
}

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/loans': 'Loans',
  '/loan-packages': 'Loan products',
  '/payments': 'Payments',
  '/farmer': 'Farmers',
  '/insurer': 'Dashboard',
  '/insurance': 'Insurance',
  '/admin': 'Users',
  '/admin/reports': 'Reports',
  '/audit': 'Audit Logs',
  '/consent': 'Settings',
  '/profile': 'My profile',
  '/settings': 'Settings',
  '/notifications': 'Notifications',
  '/contracts': 'Receivables',
  '/inspections': 'Field inspections',
  '/bankability': 'Warehouse claims',
  '/payment-watch': 'Remittances',
  '/consent-vault': 'Farmer consent',
  '/trust-ladder': 'Credit tiers',
  '/bankability/v2': 'Guarantee operations',
  '/cooperative': 'Cooperative ops',
}

const BANK_PAGE_TITLES = {
  '/': 'Credit desk',
}

const SEARCH_CONFIG = {
  '/farmer': { placeholder: 'Search farmers…', target: '/farmer', label: 'Search farmers' },
  '/loans': { placeholder: 'Search loans…', target: '/loans', label: 'Search loans' },
  '/payments': { placeholder: 'Search transactions…', target: '/payments', label: 'Search transactions' },
  default: { placeholder: 'Search farmers…', target: '/farmer', label: 'Search farmers' },
}

function getPageTitle(pathname, role) {
  if (pathname.startsWith('/farmer/') && pathname !== '/farmer/profile') return 'Farmer Profile'
  if (pathname === '/farmer/profile') return 'Farmer Profile'
  if (role === 'BANK' && BANK_PAGE_TITLES[pathname]) return BANK_PAGE_TITLES[pathname]
  return PAGE_TITLES[pathname] || 'Portal'
}

function getBreadcrumbs(pathname, homePath, role) {
  const crumbs = [{ label: 'Home', to: homePath }]

  // Role home pages should not show Home › Dashboard.
  if (pathname === homePath) {
    return crumbs
  }

  if (
    pathname === '/' ||
    pathname === '/insurer' ||
    pathname === '/cooperative' ||
    pathname === '/inspections' ||
    pathname === '/admin/reports' ||
    pathname === '/bankability/v2' ||
    pathname === '/payment-watch' ||
    pathname === '/consent-vault' ||
    pathname === '/trust-ladder'
  ) {
    const label =
      role === 'BANK' && BANK_PAGE_TITLES[pathname]
        ? BANK_PAGE_TITLES[pathname]
        : PAGE_TITLES[pathname] || 'Dashboard'
    crumbs.push({ label })
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

function MainLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const moreRef = useRef(null)

  const [menuOpen, setMenuOpen] = useState(false)
  const currentRole = getCurrentUser()?.role || 'BANK'
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark' || stored === 'light') return stored === 'dark'
    // Bank partners default to institutional light theme
    return false
  })
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [routePath, setRoutePath] = useState(location.pathname)
  const [profileIncomplete, setProfileIncomplete] = useState(false)

  if (location.pathname !== routePath) {
    setRoutePath(location.pathname)
    setMenuOpen(false)
    setMoreOpen(false)
  }

  const navItems = navItemsByRole[currentRole] || navItemsByRole.BANK
  const moreItems = moreItemsByRole[currentRole] || []
  const moreActive = moreItems.some(
    (item) =>
      location.pathname === item.to || location.pathname.startsWith(`${item.to}/`),
  )
  const canSearch = currentRole === 'BANK' || currentRole === 'ADMIN'
  const homePath = getHomePathForRole(currentRole)
  const pageTitle = useMemo(
    () => getPageTitle(location.pathname, currentRole),
    [location.pathname, currentRole],
  )
  const breadcrumbs = useMemo(
    () => getBreadcrumbs(location.pathname, homePath, currentRole),
    [location.pathname, homePath, currentRole],
  )
  const searchConfig = useMemo(() => getSearchConfig(location.pathname), [location.pathname])
  const settingsPath = '/settings'

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    const query = searchQuery.trim()
    if (!query) return
    navigate(searchConfig.target, { state: { search: query } })
    setSearchQuery('')
  }

  const handleLogout = () => {
    setMoreOpen(false)
    setShowLogoutModal(true)
  }

  const confirmLogout = () => {
    clearSession()
    navigate('/login', { replace: true })
  }

  useEffect(() => {
    const applyProfile = (profile) => {
      if (!profile) return
      setProfileIncomplete(!profile.fullName?.trim() || !profile.phone)
    }

    hydrateSessionUser().then(applyProfile).catch(() => {})

    const onProfileUpdated = (event) => applyProfile(event.detail)
    window.addEventListener('agri:profile-updated', onProfileUpdated)
    return () => window.removeEventListener('agri:profile-updated', onProfileUpdated)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!moreRef.current?.contains(event.target)) setMoreOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  const shellThemeClass = darkMode ? 'neon-dashboard' : 'portal-light'
  const roleShellClass = currentRole === 'BANK' ? 'app-shell--bank' : ''
  return (
    <PortalThemeContext.Provider value={{ isDark: darkMode, setIsDark: setDarkMode }}>
      <div className={`app-shell ${shellThemeClass} ${roleShellClass}`.trim()}>
        <aside className={`sidebar sidebar--flat ${menuOpen ? 'open' : ''}`}>
          <Link to={homePath} className="brand" onClick={() => setMenuOpen(false)}>
            Agri Trust
          </Link>

          <nav className="sidebar-nav" aria-label="Main">
            {navItems.map((item) => {
              return (
                <NavLink
                  key={`${item.label}-${item.to}`}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `nav-link nav-link--flat${isActive ? ' active' : ''}`
                  }
                >
                  <item.icon size={24} strokeWidth={1.75} />
                  <span className="nav-link__label">{item.label}</span>
                </NavLink>
              )
            })}
          </nav>

          <div className="sidebar-more" ref={moreRef}>
            <button
              type="button"
              className={`nav-link nav-link--flat nav-link--button${moreOpen || moreActive ? ' active' : ''}`}
              onClick={() => setMoreOpen((prev) => !prev)}
              aria-expanded={moreOpen}
            >
              <MoreHorizontal size={24} strokeWidth={1.75} />
              <span className="nav-link__label">More</span>
            </button>
            {moreOpen ? (
              <div className="sidebar-more__menu" role="menu">
                {moreItems.length > 0 ? (
                  <>
                    <span className="sidebar-more__heading">
                      {currentRole === 'BANK' ? 'Risk & receivables' : 'More tools'}
                    </span>
                    {moreItems.map((item) => (
                      <button
                        key={item.to}
                        type="button"
                        className={`sidebar-more__item${
                          location.pathname === item.to ||
                          location.pathname.startsWith(`${item.to}/`)
                            ? ' sidebar-more__item--active'
                            : ''
                        }`}
                        role="menuitem"
                        onClick={() => {
                          setMoreOpen(false)
                          setMenuOpen(false)
                          navigate(item.to)
                        }}
                      >
                        <item.icon size={16} />
                        {item.label}
                      </button>
                    ))}
                    <span className="sidebar-more__divider" aria-hidden />
                  </>
                ) : null}
                <button
                  type="button"
                  className="sidebar-more__item"
                  role="menuitem"
                  onClick={() => {
                    setMoreOpen(false)
                    setMenuOpen(false)
                    navigate('/profile')
                  }}
                >
                  <User size={16} />
                  Account
                </button>
                <button
                  type="button"
                  className="sidebar-more__item"
                  role="menuitem"
                  onClick={() => {
                    setMoreOpen(false)
                    setMenuOpen(false)
                    navigate(settingsPath)
                  }}
                >
                  <Settings size={16} />
                  Settings
                </button>
                <button
                  type="button"
                  className="sidebar-more__item sidebar-more__item--danger"
                  role="menuitem"
                  onClick={handleLogout}
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            ) : null}
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
            </div>
          </header>

          <main className="main-content">
            {profileIncomplete && location.pathname !== '/profile' ? (
              <aside className="profile-nudge" aria-labelledby="profile-nudge-title">
                <span className="profile-nudge__icon" aria-hidden>
                  <UserRound size={17} />
                </span>
                <div>
                  <strong id="profile-nudge-title">Complete your profile</strong>
                  <p>Add your full name and phone number to help your organization identify you.</p>
                </div>
                <Link to="/profile" className="btn-primary">
                  Complete profile
                </Link>
              </aside>
            ) : null}
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
