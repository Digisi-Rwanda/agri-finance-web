import { Bell, LockKeyhole, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import PageHeader from '../components/ui/PageHeader'
import StatusBadge from '../components/ui/StatusBadge'
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
    <label className="settings-toggle">
      <div>
        <strong>{label}</strong>
        {description ? <p>{description}</p> : null}
      </div>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  )
}

function SettingsPage() {
  const currentRole = getCurrentUser()?.role || 'BANK'
  const isFarmer = currentRole === 'FARMER'

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
    toast.success('Notification preference saved.')
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

  if (loading) {
    return (
      <section className="dashboard-page account-page">
        <PageHeader title="Settings" subtitle="Loading preferences…" />
        <div className="account-skeleton card" />
      </section>
    )
  }

  return (
    <section className="dashboard-page account-page">
      <PageHeader
        breadcrumb="Home › Settings"
        subtitle="Manage your account, notifications, and data permissions."
        actions={
          <Link to="/profile" className="btn-secondary">
            View profile
          </Link>
        }
      />

      <div className="settings-layout">
        <article className="card settings-card">
          <div className="settings-card__head">
            <h3>Account</h3>
            <p>Your sign-in details on Agri Trust.</p>
          </div>
          <dl className="account-details account-details--compact">
            <div>
              <dt>Display name</dt>
              <dd>{profile?.fullName || profile?.username || '—'}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{profile?.email || '—'}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{ROLE_LABELS[profile?.role] || profile?.role || '—'}</dd>
            </div>
            <div>
              <dt>Email verification</dt>
              <dd>
                <StatusBadge value={profile?.emailVerified ? 'Verified' : 'Pending'} />
              </dd>
            </div>
          </dl>
          <div className="settings-card__actions">
            <Link to="/forgot-password" className="btn-secondary">
              Change password
            </Link>
            <Link to="/profile" className="btn-view">
              Open profile
            </Link>
          </div>
        </article>

        <article className="card settings-card">
          <div className="settings-card__head">
            <Bell size={18} />
            <div>
              <h3>Notifications</h3>
              <p>Choose which alerts you receive in the portal.</p>
            </div>
          </div>
          <div className="settings-toggle-list">
            <SettingToggle
              label="Loan updates"
              description="Approvals, rejections, and disbursement notices."
              checked={notifications.loanUpdates}
              onChange={(value) => saveNotificationPref('loanUpdates', value)}
            />
            <SettingToggle
              label="Payment alerts"
              description="MoMo payment confirmations and reminders."
              checked={notifications.paymentAlerts}
              onChange={(value) => saveNotificationPref('paymentAlerts', value)}
            />
            <SettingToggle
              label="System announcements"
              description="Platform maintenance and product updates."
              checked={notifications.systemNews}
              onChange={(value) => saveNotificationPref('systemNews', value)}
            />
          </div>
          <Link to="/notifications" className="btn-view settings-card__link">
            View notification inbox
          </Link>
        </article>

        {isFarmer ? (
          <article className="card settings-card">
            <div className="settings-card__head">
              <LockKeyhole size={18} />
              <div>
                <h3>Data sharing & consent</h3>
                <p>Control what financial and farm data partners can access.</p>
              </div>
            </div>
            <div className="settings-toggle-list">
              <SettingToggle
                label="Share transactions"
                description="Allow banks to view your transaction history for credit scoring."
                checked={consent.shareTransactions}
                disabled={consentBusy}
                onChange={() => handleConsentToggle('shareTransactions')}
              />
              <SettingToggle
                label="Share satellite data"
                description="Allow insurers and lenders to use farm imagery for risk assessment."
                checked={consent.shareSatelliteData}
                disabled={consentBusy}
                onChange={() => handleConsentToggle('shareSatelliteData')}
              />
            </div>
          </article>
        ) : null}

        <article className="card settings-card">
          <div className="settings-card__head">
            <ShieldCheck size={18} />
            <div>
              <h3>Security & privacy</h3>
              <p>How your account is protected.</p>
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
              <span>Consent audit trail</span>
              <StatusBadge value="Active" />
            </li>
          </ul>
        </article>
      </div>
    </section>
  )
}

export default SettingsPage
