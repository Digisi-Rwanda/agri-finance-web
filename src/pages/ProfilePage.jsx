import {
  ArrowLeft,
  Building2,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  Settings,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
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
        const data = await getProfile()
        setProfile(data)
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
          <h1>Profile</h1>
        </div>
        <div className="account-skeleton card" />
      </section>
    )
  }

  if (error || !profile) {
    return (
      <section className="dashboard-page account-page">
        <div className="account-toolbar">
          <h1>Profile</h1>
          <Link to="/" className="btn-secondary">
            <ArrowLeft size={16} />
            Home
          </Link>
        </div>
        <article className="card account-alert">{error || 'Profile unavailable.'}</article>
      </section>
    )
  }

  const displayName = formatDisplayName(profile.fullName || profile.username || 'User')
  const initials = getUserInitials(profile)
  const roleLabel = ROLE_LABELS[profile.role] || profile.role
  const isBank = profile.role === 'BANK' || profile.role === 'ADMIN'

  return (
    <section className="dashboard-page dashboard-page--compact account-page">
      <div className="account-toolbar">
        <div>
          <nav className="account-toolbar__crumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span aria-hidden>/</span>
            <span>Profile</span>
          </nav>
          <h1>Profile</h1>
        </div>
        <div className="account-toolbar__actions">
          <Link to="/settings" className="btn-primary">
            <Settings size={16} />
            Settings
          </Link>
        </div>
      </div>

      <article className="account-id-card">
        <div className="account-id-card__photo">
          {profile.profilePhoto ? (
            <img src={profile.profilePhoto} alt="" className="account-id-card__img" />
          ) : (
            <div className="account-id-card__placeholder">
              <UserRound size={36} strokeWidth={1.5} aria-hidden />
              <span>{initials}</span>
            </div>
          )}
        </div>

        <div className="account-id-card__body">
          <div className="account-id-card__head">
            <div>
              <h2 className="account-id-card__name">{displayName}</h2>
              <p className="account-id-card__meta">
                @{profile.username}
                {profile.institution ? ` · ${profile.institution}` : ''}
              </p>
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
        </div>

        <div className="account-id-card__status">
          <div>
            <small>Email</small>
            <strong>{profile.emailVerified ? 'Verified' : 'Pending'}</strong>
          </div>
          {profile.registrationDate ? (
            <div>
              <small>Member since</small>
              <strong>{String(profile.registrationDate).slice(0, 10)}</strong>
            </div>
          ) : null}
          {profile.farmerId ? (
            <div>
              <small>Farmer ID</small>
              <strong>{profile.farmerId}</strong>
            </div>
          ) : null}
        </div>
      </article>

      <div className="account-grid">
        <article className="card account-panel">
          <div className="account-panel__head">
            <UserRound size={18} />
            <h3>Account details</h3>
          </div>
          <dl className="account-details">
            <div>
              <dt>Full name</dt>
              <dd>{profile.fullName || '—'}</dd>
            </div>
            <div>
              <dt>Username</dt>
              <dd>{profile.username || '—'}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{profile.email || '—'}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{profile.phone ? formatRwandaPhoneDisplay(profile.phone) : '—'}</dd>
            </div>
          </dl>
        </article>

        <article className="card account-panel">
          <div className="account-panel__head">
            <Building2 size={18} />
            <h3>{isBank ? 'Institution' : 'Identity'}</h3>
          </div>
          <dl className="account-details">
            <div>
              <dt>Portal role</dt>
              <dd>{roleLabel}</dd>
            </div>
            <div>
              <dt>Institution</dt>
              <dd>{profile.institution || (isBank ? 'Bank partner' : '—')}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{profile.location || '—'}</dd>
            </div>
            <div>
              <dt>National ID</dt>
              <dd>{profile.nationalId || '—'}</dd>
            </div>
          </dl>
        </article>

        <article className="card account-panel account-panel--wide">
          <div className="account-panel__head">
            <ShieldCheck size={18} />
            <h3>Security</h3>
          </div>
          <ul className="account-security-list">
            <li>
              <span>
                <LockKeyhole size={15} aria-hidden />
                Secure session
              </span>
              <StatusBadge value="Active" />
            </li>
            <li>
              <span>
                <ShieldCheck size={15} aria-hidden />
                Email verification
              </span>
              <StatusBadge value={profile.emailVerified ? 'Verified' : 'Pending'} />
            </li>
            <li>
              <span>Password</span>
              <Link to="/forgot-password" className="btn-view">
                Reset password
              </Link>
            </li>
          </ul>
        </article>
      </div>
    </section>
  )
}

export default ProfilePage
