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
import PortalLanguageSwitcher from '../components/layout/PortalLanguageSwitcher'
import { PortalThemeContext } from '../context/PortalThemeContext'
import { usePortalCopy } from '../context/AuthLocaleContext'
import { getHomePathForRole } from '../utils/roles'

const NAV_BY_ROLE = {
  BANK: [
    { to: '/', labelKey: 'home', icon: Home, end: true },
    { to: '/farmer', labelKey: 'farmers', icon: UserRound },
    { to: '/loans', labelKey: 'loans', icon: Landmark },
    { to: '/loan-packages', labelKey: 'loanProducts', icon: ClipboardCheck },
    { to: '/payments', labelKey: 'payments', icon: CreditCard },
  ],
  INSURER: [
    { to: '/insurer', labelKey: 'home', icon: Home, end: true },
    { to: '/insurance', labelKey: 'insurance', icon: ShieldCheck },
    { to: '/payments', labelKey: 'payments', icon: CreditCard },
  ],
  ADMIN: [
    { to: '/', labelKey: 'home', icon: Home, end: true },
    { to: '/farmer', labelKey: 'farmers', icon: UserRound },
    { to: '/loans', labelKey: 'loans', icon: Landmark },
    { to: '/loan-packages', labelKey: 'loanPackages', icon: ClipboardCheck },
    { to: '/contracts', labelKey: 'receivables', icon: Briefcase },
    { to: '/inspections', labelKey: 'inspections', icon: ClipboardCheck },
    { to: '/payment-watch', labelKey: 'paymentWatch', icon: Eye },
    { to: '/payments', labelKey: 'payments', icon: CreditCard },
    { to: '/admin', labelKey: 'users', icon: Users },
    { to: '/admin/reports', labelKey: 'reports', icon: ScrollText },
  ],
  FARMER: [{ to: '/payments', labelKey: 'home', icon: Home, end: true }],
  COOPERATIVE: [{ to: '/', labelKey: 'home', icon: Home, end: true }],
  INSPECTOR: [{ to: '/', labelKey: 'home', icon: Home, end: true }],
  GUARANTEE_OFFICER: [
    { to: '/bankability/v2', labelKey: 'guarantees', icon: ShieldCheck, end: true },
    { to: '/bankability', labelKey: 'warehouseClaims', icon: Warehouse },
    { to: '/payment-watch', labelKey: 'paymentWatch', icon: Eye },
    { to: '/consent-vault', labelKey: 'consentVault', icon: FileKey },
    { to: '/trust-ladder', labelKey: 'trustLadder', icon: Layers },
    { to: '/contracts', labelKey: 'receivables', icon: Briefcase },
  ],
  REGISTRATION_OFFICER: [
    { to: '/admin/reports', labelKey: 'home', icon: Home, end: true },
    { to: '/farmer', labelKey: 'farmers', icon: UserRound },
    { to: '/loans', labelKey: 'loans', icon: Landmark },
    { to: '/contracts', labelKey: 'receivables', icon: Briefcase },
    { to: '/consent-vault', labelKey: 'consentVault', icon: FileKey },
    { to: '/insurance', labelKey: 'insurance', icon: ShieldCheck },
    { to: '/payments', labelKey: 'payments', icon: CreditCard },
  ],
}

const MORE_BY_ROLE = {
  BANK: [
    { to: '/contracts', labelKey: 'receivables', icon: Briefcase },
    { to: '/payment-watch', labelKey: 'remittances', icon: Eye },
    { to: '/consent-vault', labelKey: 'farmerConsent', icon: FileKey },
    { to: '/trust-ladder', labelKey: 'creditTiers', icon: Layers },
  ],
  ADMIN: [
    { to: '/consent-vault', labelKey: 'farmerConsent', icon: FileKey },
    { to: '/trust-ladder', labelKey: 'creditTiers', icon: Layers },
    { to: '/bankability', labelKey: 'warehouseClaims', icon: Warehouse },
    { to: '/bankability/v2', labelKey: 'guarantees', icon: ShieldCheck },
    { to: '/cooperative', labelKey: 'cooperative', icon: Warehouse },
    { to: '/insurance', labelKey: 'insurance', icon: ShieldCheck },
    { to: '/audit', labelKey: 'auditLogs', icon: FileKey },
  ],
}

function getPageTitle(pathname, role, portal) {
  if (pathname.startsWith('/farmer/') && pathname !== '/farmer/profile') return portal.layout.farmerProfile
  if (pathname === '/farmer/profile') return portal.layout.farmerProfile
  if (role === 'BANK' && pathname === '/') return portal.layout.bankCreditDesk
  return portal.layout.pageTitles[pathname] || portal.layout.portal
}

function getBreadcrumbs(pathname, homePath, role, portal) {
  const crumbs = [{ label: portal.layout.breadcrumbHome, to: homePath }]

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
      role === 'BANK' && pathname === '/'
        ? portal.layout.bankCreditDesk
        : portal.layout.pageTitles[pathname] || portal.layout.portal
    crumbs.push({ label })
    return crumbs
  }

  if (pathname.startsWith('/farmer/')) {
    crumbs.push({ label: portal.nav.farmers, to: '/farmer' })
    crumbs.push({ label: portal.layout.farmerProfile })
    return crumbs
  }

  if (pathname === '/profile') {
    crumbs.push({ label: portal.layout.myProfile })
    return crumbs
  }

  if (pathname === '/settings' || pathname === '/consent') {
    crumbs.push({ label: portal.layout.settings })
    return crumbs
  }

  const title = portal.layout.pageTitles[pathname]
  if (title) crumbs.push({ label: title })
  return crumbs
}

function getSearchConfig(pathname, portal) {
  if (pathname.startsWith('/farmer')) {
    return {
      placeholder: portal.layout.searchFarmers,
      target: '/farmer',
      label: portal.layout.searchFarmersLabel,
    }
  }
  if (pathname.startsWith('/loans')) {
    return {
      placeholder: portal.layout.searchLoans,
      target: '/loans',
      label: portal.layout.searchLoansLabel,
    }
  }
  if (pathname.startsWith('/payments')) {
    return {
      placeholder: portal.layout.searchTransactions,
      target: '/payments',
      label: portal.layout.searchTransactionsLabel,
    }
  }
  return {
    placeholder: portal.layout.searchFarmers,
    target: '/farmer',
    label: portal.layout.searchFarmersLabel,
  }
}

function MainLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const moreRef = useRef(null)
  const portal = usePortalCopy()

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

  const navItems = (NAV_BY_ROLE[currentRole] || NAV_BY_ROLE.BANK).map((item) => ({
    ...item,
    label: portal.nav[item.labelKey] || item.labelKey,
  }))
  const moreItems = (MORE_BY_ROLE[currentRole] || []).map((item) => ({
    ...item,
    label: portal.nav[item.labelKey] || item.labelKey,
  }))
  const moreActive = moreItems.some(
    (item) =>
      location.pathname === item.to || location.pathname.startsWith(`${item.to}/`),
  )
  const canSearch = currentRole === 'BANK' || currentRole === 'ADMIN'
  const homePath = getHomePathForRole(currentRole)
  const pageTitle = useMemo(
    () => getPageTitle(location.pathname, currentRole, portal),
    [location.pathname, currentRole, portal],
  )
  const breadcrumbs = useMemo(
    () => getBreadcrumbs(location.pathname, homePath, currentRole, portal),
    [location.pathname, homePath, currentRole, portal],
  )
  const searchConfig = useMemo(
    () => getSearchConfig(location.pathname, portal),
    [location.pathname, portal],
  )
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
          <Link to={homePath} className="brand brand--hinga" onClick={() => setMenuOpen(false)}>
            <img src="/hinga-icon.png" alt="" className="brand-icon" width="36" height="36" />
            <span className="brand-stack">
              <span className="brand-name">Hinga</span>
              <span className="brand-sub">{portal.layout.portal}</span>
            </span>
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
              <span className="nav-link__label">{portal.layout.more}</span>
            </button>
            {moreOpen ? (
              <div className="sidebar-more__menu" role="menu">
                {moreItems.length > 0 ? (
                  <>
                    <span className="sidebar-more__heading">
                      {currentRole === 'BANK' ? portal.layout.moreBank : portal.layout.moreTools}
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
                  {portal.layout.account}
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
                  {portal.layout.settings}
                </button>
                <button
                  type="button"
                  className="sidebar-more__item sidebar-more__item--danger"
                  role="menuitem"
                  onClick={handleLogout}
                >
                  <LogOut size={16} />
                  {portal.layout.logout}
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
                <PortalLanguageSwitcher />
                <ThemeSwitch isDark={darkMode} onChange={setDarkMode} />
                <button
                  type="button"
                  className="topbar-icon"
                  onClick={() => navigate('/notifications')}
                  aria-label={portal.layout.notifications}
                  title={portal.layout.notifications}
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
                  <strong id="profile-nudge-title">{portal.layout.completeProfileTitle}</strong>
                  <p>{portal.layout.completeProfileBody}</p>
                </div>
                <Link to="/profile" className="btn-primary">
                  {portal.layout.completeProfileBtn}
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
