import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import AuthLayout from '../components/auth/AuthLayout'
import PasswordField from '../components/auth/PasswordField'
import { loginCopy } from '../constants/authCopy'
import { clearSession, getAuthErrorMessage, loginUser } from '../services/auth'
import {
  formatRwandaPhoneDisplay,
  isValidRwandaMobile,
  normalizeRwandaPhone,
} from '../utils/rwandaPhone'
import { getHomePathForRole } from '../utils/roles'
import '../styles/auth.css'

const PARTNER_ROLES = new Set([
  'ADMIN',
  'BANK',
  'INSURER',
  'COOPERATIVE',
  'INSPECTOR',
  'GUARANTEE_OFFICER',
  'REGISTRATION_OFFICER',
])

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const prefill = location.state?.prefill
  const copy = loginCopy
  const [portal, setPortal] = useState('farmer')
  const [form, setForm] = useState({
    identifier: prefill?.email || '',
    password: '',
    remember: false,
  })
  const [loading, setLoading] = useState(false)

  const onSubmit = async (event) => {
    event.preventDefault()
    const rawIdentifier = form.identifier.trim()
    const isEmail = rawIdentifier.includes('@')

    if (portal === 'partner' && !isEmail) {
      toast.warning(copy.partnerEmailRequired)
      return
    }
    if (portal === 'farmer' && !isEmail && !isValidRwandaMobile(rawIdentifier)) {
      toast.warning(copy.farmerIdentifierInvalid)
      return
    }

    const identifier = isEmail
      ? rawIdentifier.toLowerCase()
      : normalizeRwandaPhone(rawIdentifier)

    setLoading(true)
    try {
      const { user } = await loginUser({ identifier, password: form.password, remember: form.remember })
      const isPartner = PARTNER_ROLES.has(user.role)
      if ((portal === 'farmer' && user.role !== 'FARMER') || (portal === 'partner' && !isPartner)) {
        clearSession()
        toast.error(portal === 'farmer' ? copy.usePartnerPortal : copy.useFarmerPortal)
        return
      }

      toast.success(copy.toastSuccess)
      const from = location.state?.from?.pathname
      const destination = from && from !== '/login' ? from : getHomePathForRole(user.role)
      navigate(destination, { replace: true })
    } catch (error) {
      toast.error(getAuthErrorMessage(error, copy.toastError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      compact
      title={portal === 'farmer' ? copy.farmerTitle : copy.partnerTitle}
      subtitle={portal === 'farmer' ? copy.farmerSubtitle : copy.partnerSubtitle}
      footer={
        <p className="auth-footer-text">
          {portal === 'farmer' ? (
            <>
              {copy.footerPrompt}{' '}
              <Link to="/register" className="auth-link">
                {copy.footerAction}
              </Link>
            </>
          ) : (
            copy.partnerAccessHelp
          )}
        </p>
      }
    >
      <form onSubmit={onSubmit} className="auth-form">
        <div className="auth-method-switch" role="tablist" aria-label={copy.portalLabel}>
          {[
            { id: 'farmer', label: copy.farmerTab },
            { id: 'partner', label: copy.partnerTab },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={portal === item.id}
              className={`auth-method-switch__btn${portal === item.id ? ' auth-method-switch__btn--active' : ''}`}
              onClick={() => setPortal(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <label className="auth-field-group">
          <span className="auth-label">
            {portal === 'farmer' ? copy.farmerIdentifierLabel : copy.emailLabel}
          </span>
          <input
            type={portal === 'partner' ? 'email' : 'text'}
            required
            autoComplete={portal === 'partner' ? 'email' : 'username'}
            placeholder={
              portal === 'farmer' ? copy.farmerIdentifierPlaceholder : copy.emailPlaceholder
            }
            className="auth-input"
            value={form.identifier}
            onChange={(event) => {
              const value = event.target.value
              const identifier =
                portal === 'farmer' && value && /^[+\d\s()-]+$/.test(value)
                  ? formatRwandaPhoneDisplay(value)
                  : value
              setForm((prev) => ({ ...prev, identifier }))
            }}
          />
        </label>

        <PasswordField
          label={copy.passwordLabel}
          required
          autoComplete="current-password"
          placeholder={copy.passwordPlaceholder}
          value={form.password}
          onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
        />

        <div className="auth-row">
          <label className="auth-checkbox-label">
            <input
              type="checkbox"
              checked={form.remember}
              onChange={(event) => setForm((prev) => ({ ...prev, remember: event.target.checked }))}
            />
            {copy.rememberMe}
          </label>
          <Link to="/forgot-password" className="auth-link">
            {copy.forgotPassword}
          </Link>
        </div>

        <button type="submit" className="auth-btn-primary" disabled={loading}>
          {loading ? copy.submitting : copy.submit}
        </button>
      </form>
    </AuthLayout>
  )
}

export default LoginPage
