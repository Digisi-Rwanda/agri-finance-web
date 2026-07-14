import { LockKeyhole, Mail, MapPin, Phone, Settings, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import StatusBadge from '../components/ui/StatusBadge'
import { getProfile } from '../services/auth'
import { getUserInitials, ROLE_LABELS } from '../utils/roles'
import { formatRwandaPhoneDisplay } from '../utils/rwandaPhone'

function formatDisplayName(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function ProfilePage() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        setProfile(await getProfile())
      } catch {
        setError('Could not load your profile. Please sign in again.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <section className="dashboard-page account-page">
        <div className="account-toolbar">
          <h1>Account</h1>
        </div>
        <div className="account-skeleton card" />
      </section>
    )
  }

  if (error || !profile) {
    return (
      <section className="dashboard-page account-page">
        <div className="account-toolbar">
          <h1>Account</h1>
        </div>
        <article className="card account-alert">{error || 'Profile unavailable.'}</article>
      </section>
    )
  }

  const displayName = formatDisplayName(profile.fullName || profile.username || 'User')
  const initials = getUserInitials(profile)
  const roleLabel = ROLE_LABELS[profile.role] || profile.role

  const details = [
    { label: 'Full name', value: profile.fullName || '—' },
    { label: 'Username', value: profile.username || '—' },
    { label: 'Email', value: profile.email || '—' },
    {
      label: 'Phone',
      value: profile.phone ? formatRwandaPhoneDisplay(profile.phone) : '—',
    },
    { label: 'Role', value: roleLabel },
    profile.institution ? { label: 'Institution', value: profile.institution } : null,
    profile.location ? { label: 'Location', value: profile.location } : null,
    profile.registrationDate
      ? { label: 'Member since', value: String(profile.registrationDate).slice(0, 10) }
      : null,
  ].filter(Boolean)

  return (
    <section className="dashboard-page dashboard-page--compact account-page">
      <div className="account-toolbar">
        <div>
          <nav className="account-toolbar__crumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span aria-hidden>/</span>
            <span>Account</span>
          </nav>
          <h1>Account</h1>
        </div>
        <Link to="/settings" className="btn-primary">
          <Settings size={16} />
          Settings
        </Link>
      </div>

      <article className="account-id-card account-id-card--simple">
        <div className="account-id-card__photo">
          {profile.profilePhoto ? (
            <img src={profile.profilePhoto} alt="" className="account-id-card__img" />
          ) : (
            <div className="account-id-card__placeholder">
              <UserRound size={32} strokeWidth={1.5} aria-hidden />
              <span>{initials}</span>
            </div>
          )}
        </div>

        <div className="account-id-card__body">
          <div className="account-id-card__head">
            <div>
              <h2 className="account-id-card__name">{displayName}</h2>
              <p className="account-id-card__meta">@{profile.username}</p>
            </div>
            <StatusBadge value={roleLabel} />
          </div>

          <div className="account-id-card__chips">
            {profile.email ? (
              <a href={`mailto:${profile.email}`} className="account-chip">
                <Mail size={14} aria-hidden />
                {profile.email}
              </a>
            ) : null}
            {profile.phone ? (
              <a href={`tel:${profile.phone}`} className="account-chip">
                <Phone size={14} aria-hidden />
                {formatRwandaPhoneDisplay(profile.phone)}
              </a>
            ) : null}
            {profile.location ? (
              <span className="account-chip account-chip--muted">
                <MapPin size={14} aria-hidden />
                {profile.location}
              </span>
            ) : null}
          </div>

          <div className="account-id-card__verify">
            <span>Email</span>
            <StatusBadge value={profile.emailVerified ? 'Verified' : 'Pending'} />
          </div>
        </div>
      </article>

      <article className="card account-panel">
        <div className="account-panel__head">
          <UserRound size={18} />
          <h3>Details</h3>
        </div>
        <dl className="account-details account-details--rows">
          {details.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      </article>

      <article className="card account-panel">
        <div className="account-panel__head">
          <LockKeyhole size={18} />
          <h3>Password</h3>
        </div>
        <div className="account-password-row">
          <p>Reset your sign-in password by email.</p>
          <Link to="/forgot-password" className="btn-secondary">
            Reset password
          </Link>
        </div>
      </article>
    </section>
  )
}

export default ProfilePage
