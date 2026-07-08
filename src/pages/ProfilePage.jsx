import { Building2, Mail, MapPin, Phone, Shield, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import StatusBadge from '../components/ui/StatusBadge'
import { getProfile } from '../services/auth'
import { getUserInitials, ROLE_LABELS } from '../utils/roles'
import { formatRwandaPhoneDisplay } from '../utils/rwandaPhone'

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
        <PageHeader title="My profile" subtitle="Loading account details…" />
        <div className="account-skeleton card" />
      </section>
    )
  }

  if (error || !profile) {
    return (
      <section className="dashboard-page account-page">
        <PageHeader title="My profile" />
        <article className="card account-alert">{error || 'Profile unavailable.'}</article>
      </section>
    )
  }

  const displayName = profile.fullName || profile.username || 'User'
  const initials = getUserInitials(profile)
  const roleLabel = ROLE_LABELS[profile.role] || profile.role

  return (
    <section className="dashboard-page account-page">
      <PageHeader
        breadcrumb="Home › Profile"
        subtitle="Your account details and portal access."
        actions={
          <Link to="/settings" className="btn-primary">
            Account settings
          </Link>
        }
      />

      <article className="card account-hero">
        <div className="account-hero__main">
          {profile.profilePhoto ? (
            <img src={profile.profilePhoto} alt="" className="account-hero__photo" />
          ) : (
            <span className="account-hero__avatar" aria-hidden>
              {initials}
            </span>
          )}
          <div>
            <h2>{displayName}</h2>
            <p className="account-hero__meta">@{profile.username}</p>
            <StatusBadge value={roleLabel} />
          </div>
        </div>
        <div className="account-hero__stats">
          <div>
            <small>Email verified</small>
            <strong>{profile.emailVerified ? 'Yes' : 'Pending'}</strong>
          </div>
          {profile.farmerId ? (
            <div>
              <small>Farmer ID</small>
              <strong>{profile.farmerId}</strong>
            </div>
          ) : null}
          {profile.registrationDate ? (
            <div>
              <small>Member since</small>
              <strong>{String(profile.registrationDate).slice(0, 10)}</strong>
            </div>
          ) : null}
        </div>
      </article>

      <div className="account-grid">
        <article className="card account-card">
          <div className="account-card__head">
            <UserRound size={18} />
            <h3>Personal information</h3>
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
              <dt>
                <Mail size={14} aria-hidden />
                Email
              </dt>
              <dd>{profile.email || '—'}</dd>
            </div>
            <div>
              <dt>
                <Phone size={14} aria-hidden />
                Phone
              </dt>
              <dd>{profile.phone ? formatRwandaPhoneDisplay(profile.phone) : '—'}</dd>
            </div>
          </dl>
        </article>

        <article className="card account-card">
          <div className="account-card__head">
            <Building2 size={18} />
            <h3>Location & identity</h3>
          </div>
          <dl className="account-details">
            <div>
              <dt>
                <MapPin size={14} aria-hidden />
                Location
              </dt>
              <dd>{profile.location || '—'}</dd>
            </div>
            <div>
              <dt>National ID</dt>
              <dd>{profile.nationalId || '—'}</dd>
            </div>
            <div>
              <dt>Portal role</dt>
              <dd>{roleLabel}</dd>
            </div>
          </dl>
        </article>

        <article className="card account-card">
          <div className="account-card__head">
            <Shield size={18} />
            <h3>Security</h3>
          </div>
          <ul className="account-security-list">
            <li>
              <span>Secure session</span>
              <StatusBadge value="Active" />
            </li>
            <li>
              <span>Two-factor auth</span>
              <span className="muted">Coming soon</span>
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
