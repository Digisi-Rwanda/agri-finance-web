import {
  CheckCircle2,
  LockKeyhole,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Save,
  Settings,
  UserRound,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import StatusBadge from '../components/ui/StatusBadge'
import { getAuthErrorMessage, getProfile, updateProfile } from '../services/auth'
import { getUserInitials, ROLE_LABELS } from '../utils/roles'
import {
  formatRwandaPhoneDisplay,
  isValidRwandaMobile,
  normalizeRwandaPhone,
  RWANDA_PHONE_PLACEHOLDER,
} from '../utils/rwandaPhone'

const EMPTY_FORM = { fullName: '', phone: '' }

function ProfilePage() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState({})

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

  const beginEdit = () => {
    setForm({
      fullName: profile?.fullName || '',
      phone: profile?.phone ? formatRwandaPhoneDisplay(profile.phone) : '',
    })
    setFormErrors({})
    setEditing(true)
  }

  const cancelEdit = () => {
    setEditing(false)
    setFormErrors({})
  }

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
    setFormErrors((current) =>
      current[field] ? { ...current, [field]: undefined } : current,
    )
  }

  const saveProfile = async (event) => {
    event.preventDefault()

    const nextErrors = {}
    const fullName = form.fullName.trim().replace(/\s+/g, ' ')
    if (fullName.length < 2) nextErrors.fullName = 'Enter your full name.'
    else if (fullName.length > 100) nextErrors.fullName = 'Use 100 characters or fewer.'
    if (!form.phone.trim()) nextErrors.phone = 'Enter your Rwanda mobile number.'
    else if (!isValidRwandaMobile(form.phone)) {
      nextErrors.phone = 'Enter a valid Rwanda mobile number (+250 7XX XXX XXX).'
    }

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors)
      return
    }

    setSaving(true)
    try {
      const updated = await updateProfile({
        fullName,
        phone: normalizeRwandaPhone(form.phone),
      })
      setProfile(updated)
      setEditing(false)
      toast.success('Your profile has been updated.')
    } catch (requestError) {
      toast.error(getAuthErrorMessage(requestError, 'Could not update your profile.'))
    } finally {
      setSaving(false)
    }
  }

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

  const displayName = profile.fullName?.trim() || 'Complete your profile'
  const initials = getUserInitials(profile)
  const roleLabel = ROLE_LABELS[profile.role] || profile.role
  const profileComplete = Boolean(profile.fullName?.trim() && profile.phone)

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

      {!profileComplete ? (
        <aside className="account-completion" aria-labelledby="profile-completion-title">
          <span className="account-completion__icon" aria-hidden>
            <UserRound size={18} />
          </span>
          <div>
            <strong id="profile-completion-title">Complete your profile</strong>
            <p>Add your full name and phone number so colleagues can identify and contact you.</p>
          </div>
          {!editing ? (
            <button type="button" className="btn-primary" onClick={beginEdit}>
              Complete now
            </button>
          ) : null}
        </aside>
      ) : null}

      <article className="card account-panel">
        <div className="account-panel__head">
          <UserRound size={18} />
          <div>
            <h3>Personal details</h3>
            <p>Your name and phone are visible only to authorized portal users.</p>
          </div>
          {!editing ? (
            <button type="button" className="btn-secondary account-panel__edit" onClick={beginEdit}>
              <Pencil size={14} />
              Edit
            </button>
          ) : null}
        </div>
        {editing ? (
          <form className="account-edit-form" onSubmit={saveProfile} noValidate>
            <label className="account-edit-field">
              <span>Full name</span>
              <input
                type="text"
                autoComplete="name"
                autoFocus
                maxLength={100}
                placeholder="e.g. Celine Umukamisha"
                value={form.fullName}
                onChange={updateField('fullName')}
                aria-invalid={formErrors.fullName ? true : undefined}
                aria-describedby={formErrors.fullName ? 'profile-full-name-error' : undefined}
              />
              {formErrors.fullName ? (
                <em id="profile-full-name-error">{formErrors.fullName}</em>
              ) : null}
            </label>

            <label className="account-edit-field">
              <span>Phone number</span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder={RWANDA_PHONE_PLACEHOLDER}
                value={form.phone}
                onChange={updateField('phone')}
                onBlur={() =>
                  setForm((current) => ({
                    ...current,
                    phone: current.phone.trim()
                      ? formatRwandaPhoneDisplay(current.phone)
                      : '',
                  }))
                }
                aria-invalid={formErrors.phone ? true : undefined}
                aria-describedby={formErrors.phone ? 'profile-phone-error' : undefined}
              />
              {formErrors.phone ? <em id="profile-phone-error">{formErrors.phone}</em> : null}
            </label>

            <div className="account-edit-readonly">
              <Mail size={15} aria-hidden />
              <span>
                Email and role are managed by your organization administrator.
                <strong>{profile.email}</strong>
              </span>
            </div>

            <div className="account-edit-actions">
              <button type="submit" className="btn-primary" disabled={saving}>
                <Save size={15} />
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button type="button" className="btn-secondary" onClick={cancelEdit} disabled={saving}>
                <X size={15} />
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            {profileComplete ? (
              <p className="account-profile-status">
                <CheckCircle2 size={15} aria-hidden />
                Profile complete
              </p>
            ) : null}
            <dl className="account-details account-details--rows">
              {details.map((row) => (
                <div key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
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
