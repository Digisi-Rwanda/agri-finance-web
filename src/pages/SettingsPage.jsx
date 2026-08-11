import { Bell, LockKeyhole, Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { usePageCopy } from '../context/AuthLocaleContext'
import { usePortalTheme } from '../context/PortalThemeContext'
import { getCurrentUser, getProfile } from '../services/auth'
import { getConsent, updateConsent } from '../services/consentService'

const NOTIFICATION_PREFS_KEY = 'agri_finance_notification_prefs'

function loadNotificationPrefs() {
  try {
    const raw = localStorage.getItem(NOTIFICATION_PREFS_KEY)
    return raw
      ? JSON.parse(raw)
      : { loanUpdates: true, paymentAlerts: true, systemNews: false }
  } catch {
    return { loanUpdates: true, paymentAlerts: true, systemNews: false }
  }
}

function SettingToggle({ label, description, checked, onChange, disabled }) {
  return (
    <label className={`settings-row${disabled ? ' settings-row--disabled' : ''}`}>
      <div className="settings-row__text">
        <strong>{label}</strong>
        {description ? <p>{description}</p> : null}
      </div>
      <span className="settings-switch">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="settings-switch__track" aria-hidden />
      </span>
    </label>
  )
}

function SettingsPage() {
  const { s, p, layout } = usePageCopy('settings')
  const currentRole = getCurrentUser()?.role || 'BANK'
  const isFarmer = currentRole === 'FARMER'
  const { isDark, setIsDark } = usePortalTheme()

  const [consent, setConsent] = useState({
    shareTransactions: false,
    shareSatelliteData: false,
  })
  const [notifications, setNotifications] = useState(loadNotificationPrefs)
  const [loading, setLoading] = useState(true)
  const [consentBusy, setConsentBusy] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        await getProfile()
        if (isFarmer) {
          setConsent(await getConsent())
        }
      } catch {
        toast.error(p.loadFailed)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [isFarmer, p.loadFailed])

  const saveNotificationPref = (key, value) => {
    const next = { ...notifications, [key]: value }
    setNotifications(next)
    localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(next))
    toast.success(p.prefSaved)
  }

  const handleConsentToggle = async (key) => {
    const nextValue = !consent[key]
    setConsent((prev) => ({ ...prev, [key]: nextValue }))
    setConsentBusy(true)
    try {
      await updateConsent({ [key]: nextValue })
      const msg =
        key === 'shareTransactions'
          ? nextValue
            ? p.transactionsEnabled
            : p.transactionsDisabled
          : nextValue
            ? p.satelliteEnabled
            : p.satelliteDisabled
      toast.success(msg)
    } catch {
      setConsent((prev) => ({ ...prev, [key]: !nextValue }))
      toast.error(p.consentFailed)
    } finally {
      setConsentBusy(false)
    }
  }

  const setTheme = (dark) => {
    if (typeof setIsDark === 'function') setIsDark(dark)
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }

  if (loading) {
    return (
      <section className="dashboard-page account-page">
        <div className="account-toolbar">
          <h1>{p.title}</h1>
        </div>
        <div className="account-skeleton card" />
      </section>
    )
  }

  return (
    <section className="dashboard-page dashboard-page--compact account-page">
      <div className="account-toolbar">
        <div>
          <nav className="account-toolbar__crumb" aria-label="Breadcrumb">
            <Link to="/">{layout.breadcrumbHome || s.home}</Link>
            <span aria-hidden>/</span>
            <span>{p.title}</span>
          </nav>
          <h1>{p.title}</h1>
        </div>
        <Link to="/profile" className="btn-secondary">
          {p.account}
        </Link>
      </div>

      <div className="settings-layout">
        <article className="card settings-panel">
          <div className="settings-panel__head">
            {isDark ? <Moon size={18} /> : <Sun size={18} />}
            <h3>{p.appearance}</h3>
          </div>
          <div className="settings-theme" role="group" aria-label={p.themeGroup}>
            <button
              type="button"
              className={`settings-theme__btn${!isDark ? ' settings-theme__btn--active' : ''}`}
              onClick={() => setTheme(false)}
            >
              <Sun size={16} />
              {p.light}
            </button>
            <button
              type="button"
              className={`settings-theme__btn${isDark ? ' settings-theme__btn--active' : ''}`}
              onClick={() => setTheme(true)}
            >
              <Moon size={16} />
              {p.dark}
            </button>
          </div>
        </article>

        <article className="card settings-panel">
          <div className="settings-panel__head">
            <Bell size={18} />
            <h3>{p.notifications}</h3>
          </div>
          <div className="settings-toggle-list">
            <SettingToggle
              label={p.loanUpdates}
              description={p.loanUpdatesDesc}
              checked={notifications.loanUpdates}
              onChange={(value) => saveNotificationPref('loanUpdates', value)}
            />
            <SettingToggle
              label={p.paymentAlerts}
              description={p.paymentAlertsDesc}
              checked={notifications.paymentAlerts}
              onChange={(value) => saveNotificationPref('paymentAlerts', value)}
            />
            <SettingToggle
              label={p.systemNews}
              description={p.systemNewsDesc}
              checked={notifications.systemNews}
              onChange={(value) => saveNotificationPref('systemNews', value)}
            />
          </div>
          <Link to="/notifications" className="btn-view settings-panel__link">
            {p.openInbox}
          </Link>
        </article>

        {isFarmer ? (
          <article className="card settings-panel">
            <div className="settings-panel__head">
              <LockKeyhole size={18} />
              <h3>{p.dataSharing}</h3>
            </div>
            <div className="settings-toggle-list">
              <SettingToggle
                label={p.shareTransactions}
                description={p.shareTransactionsDesc}
                checked={consent.shareTransactions}
                disabled={consentBusy}
                onChange={() => handleConsentToggle('shareTransactions')}
              />
              <SettingToggle
                label={p.shareSatellite}
                description={p.shareSatelliteDesc}
                checked={consent.shareSatelliteData}
                disabled={consentBusy}
                onChange={() => handleConsentToggle('shareSatelliteData')}
              />
            </div>
          </article>
        ) : null}

        <article className="card settings-panel">
          <div className="settings-panel__head">
            <LockKeyhole size={18} />
            <h3>{p.password}</h3>
          </div>
          <div className="account-password-row">
            <p>{p.passwordDesc}</p>
            <Link to="/forgot-password" className="btn-secondary">
              {p.resetPassword}
            </Link>
          </div>
        </article>
      </div>
    </section>
  )
}

export default SettingsPage
