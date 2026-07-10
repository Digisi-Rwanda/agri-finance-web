import {
  ArrowLeft,
  Bell,
  LockKeyhole,
  Moon,
  ShieldCheck,
  Sun,
  UserRound,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import StatusBadge from '../components/ui/StatusBadge'
import { usePortalTheme } from '../context/PortalThemeContext'
import { getCurrentUser, getProfile } from '../services/auth'
import { getConsent, updateConsent } from '../services/consentService'
import { ROLE_LABELS } from '../utils/roles'

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
  const currentRole = getCurrentUser()?.role || 'BANK'
  const isFarmer = currentRole === 'FARMER'
  const isBankLike = currentRole === 'BANK' || currentRole === 'ADMIN'
  const { isDark, setIsDark } = usePortalTheme()

  const [profile, setProfile] = useState(null)
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
        const profileData = await getProfile()
        setProfile(profileData)
        if (isFarmer) {
          const consentData = await getConsent()
          setConsent(consentData)
        }
      } catch {
        toast.error('Unable to load settings.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [isFarmer])

  const saveNotificationPref = (key, value) => {
    const next = { ...notifications, [key]: value }
    setNotifications(next)
    localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(next))
    toast.success('Preference saved.')
  }

  const handleConsentToggle = async (key) => {
    const nextValue = !consent[key]
    setConsent((prev) => ({ ...prev, [key]: nextValue }))
    setConsentBusy(true)
    try {
      await updateConsent({ [key]: nextValue })
      toast.success(
        `${key === 'shareTransactions' ? 'Transactions' : 'Satellite data'} sharing ${nextValue ? 'enabled' : 'disabled'}.`,
      )
    } catch {
      setConsent((prev) => ({ ...prev, [key]: !nextValue }))
      toast.error('Failed to update consent preference.')
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
          <h1>Settings</h1>
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
            <Link to="/">Home</Link>
            <span aria-hidden>/</span>
            <span>Settings</span>
          </nav>
          <h1>Settings</h1>
        </div>
        <div className="account-toolbar__actions">
          <Link to="/profile" className="btn-secondary">
            <ArrowLeft size={16} />
            Profile
          </Link>
        </div>
      </div>

      <div className="settings-layout">
        <article className="card settings-panel">
          <div className="settings-panel__head">
            <UserRound size={18} />
            <div>
              <h3>Account</h3>
              <p>Sign-in details for this portal.</p>
            </div>
          </div>

          <div className="settings-account-summary">
            <div>
              <small>Name</small>
              <strong>{profile?.fullName || profile?.username || '—'}</strong>
            </div>
            <div>
              <small>Email</small>
              <strong>{profile?.email || '—'}</strong>
            </div>
            <div>
              <small>Role</small>
              <strong>{ROLE_LABELS[profile?.role] || profile?.role || '—'}</strong>
            </div>
            <div>
              <small>Verification</small>
              <StatusBadge value={profile?.emailVerified ? 'Verified' : 'Pending'} />
            </div>
          </div>

          <div className="settings-panel__actions">
            <Link to="/forgot-password" className="btn-secondary">
              <LockKeyhole size={15} />
              Change password
            </Link>
            <Link to="/profile" className="btn-view">
              View full profile
            </Link>
          </div>
        </article>

        <article className="card settings-panel">
          <div className="settings-panel__head">
            {isDark ? <Moon size={18} /> : <Sun size={18} />}
            <div>
              <h3>Appearance</h3>
              <p>Choose light or dark for the portal.</p>
            </div>
          </div>
          <div className="settings-theme" role="group" aria-label="Theme">
            <button
              type="button"
              className={`settings-theme__btn${!isDark ? ' settings-theme__btn--active' : ''}`}
              onClick={() => setTheme(false)}
            >
              <Sun size={16} />
              Light
            </button>
            <button
              type="button"
              className={`settings-theme__btn${isDark ? ' settings-theme__btn--active' : ''}`}
              onClick={() => setTheme(true)}
            >
              <Moon size={16} />
              Dark
            </button>
          </div>
        </article>

        <article className="card settings-panel">
          <div className="settings-panel__head">
            <Bell size={18} />
            <div>
              <h3>Notifications</h3>
              <p>
                {isBankLike
                  ? 'Alerts for lending and payment activity.'
                  : 'Choose which alerts you receive.'}
              </p>
            </div>
          </div>
          <div className="settings-toggle-list">
            <SettingToggle
              label="Loan updates"
              description={
                isBankLike
                  ? 'New applications, approvals, and status changes.'
                  : 'Approvals, rejections, and disbursement notices.'
              }
              checked={notifications.loanUpdates}
              onChange={(value) => saveNotificationPref('loanUpdates', value)}
            />
            <SettingToggle
              label="Payment alerts"
              description="MoMo confirmations and repayment reminders."
              checked={notifications.paymentAlerts}
              onChange={(value) => saveNotificationPref('paymentAlerts', value)}
            />
            <SettingToggle
              label="System announcements"
              description="Maintenance and product updates."
              checked={notifications.systemNews}
              onChange={(value) => saveNotificationPref('systemNews', value)}
            />
          </div>
          <Link to="/notifications" className="btn-view settings-panel__link">
            Open notification inbox
          </Link>
        </article>

        {isFarmer ? (
          <article className="card settings-panel">
            <div className="settings-panel__head">
              <LockKeyhole size={18} />
              <div>
                <h3>Data sharing</h3>
                <p>Control what partners can access.</p>
              </div>
            </div>
            <div className="settings-toggle-list">
              <SettingToggle
                label="Share transactions"
                description="Allow banks to view transaction history for credit scoring."
                checked={consent.shareTransactions}
                disabled={consentBusy}
                onChange={() => handleConsentToggle('shareTransactions')}
              />
              <SettingToggle
                label="Share satellite data"
                description="Allow insurers and lenders to use farm imagery for risk."
                checked={consent.shareSatelliteData}
                disabled={consentBusy}
                onChange={() => handleConsentToggle('shareSatelliteData')}
              />
            </div>
          </article>
        ) : (
          <article className="card settings-panel">
            <div className="settings-panel__head">
              <ShieldCheck size={18} />
              <div>
                <h3>Partner access</h3>
                <p>How farmer data reaches your institution.</p>
              </div>
            </div>
            <ul className="account-security-list">
              <li>
                <span>Bank consent required</span>
                <StatusBadge value="Enforced" />
              </li>
              <li>
                <span>Only consented farmers visible</span>
                <StatusBadge value="Active" />
              </li>
              <li>
                <span>Actions logged in audit trail</span>
                <StatusBadge value="Active" />
              </li>
            </ul>
          </article>
        )}

        <article className="card settings-panel">
          <div className="settings-panel__head">
            <ShieldCheck size={18} />
            <div>
              <h3>Security</h3>
              <p>Protections on this account.</p>
            </div>
          </div>
          <ul className="account-security-list">
            <li>
              <span>Encrypted API requests</span>
              <StatusBadge value="Enabled" />
            </li>
            <li>
              <span>Auto logout on session expiry</span>
              <StatusBadge value="Enabled" />
            </li>
            <li>
              <span>Password reset via email</span>
              <Link to="/forgot-password" className="btn-view">
                Reset
              </Link>
            </li>
          </ul>
        </article>
      </div>
    </section>
  )
}

export default SettingsPage
