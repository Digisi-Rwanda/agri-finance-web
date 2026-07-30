import { Smartphone } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import AuthField from '../components/auth/AuthField'
import AuthLayout from '../components/auth/AuthLayout'
import AuthSubmitButton from '../components/auth/AuthSubmitButton'
import PasswordField from '../components/auth/PasswordField'
import { useAuthCopy } from '../context/AuthLocaleContext'
import { clearSession, getAuthErrorMessage, loginUser } from '../services/auth'
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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
/** Failed attempts before we point people at password reset instead of retrying. */
const FAILURES_BEFORE_RESET_HINT = 2

const MOBILE_APP_URL = import.meta.env.VITE_MOBILE_APP_URL || ''

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const prefill = location.state?.prefill
  const copy = useAuthCopy().login
  const [form, setForm] = useState({
    email: prefill?.email || '',
    password: '',
    remember: false,
  })
  const [errors, setErrors] = useState({})
  const [failures, setFailures] = useState(0)
  const [loading, setLoading] = useState(false)

  const updateField = (field) => (event) => {
    const value = field === 'remember' ? event.target.checked : event.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev))
  }

  const validate = (email, password) => {
    const nextErrors = {}
    if (!email) nextErrors.email = copy.emailRequired
    else if (!EMAIL_PATTERN.test(email)) nextErrors.email = copy.emailInvalid
    if (!password) nextErrors.password = copy.passwordRequired
    return nextErrors
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    const email = form.email.trim().toLowerCase()

    const nextErrors = validate(email, form.password)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    setErrors({})

    setLoading(true)
    try {
      const { user } = await loginUser({
        identifier: email,
        password: form.password,
        remember: form.remember,
      })
      const isPartner = PARTNER_ROLES.has(user.role)
      if (!isPartner) {
        clearSession()
        toast.error(copy.partnerOnly)
        return
      }

      toast.success(copy.toastSuccess)
      const from = location.state?.from?.pathname
      const destination = from && from !== '/login' ? from : getHomePathForRole(user.role)
      navigate(destination, { replace: true })
    } catch (error) {
      setFailures((count) => count + 1)
      toast.error(getAuthErrorMessage(error, copy.toastError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      compact
      eyebrow={copy.partnerEyebrow}
      title={copy.partnerTitle}
      subtitle={copy.partnerSubtitle}
      footer={
        <>
          <p className="auth-footer-text">{copy.partnerAccessHelp}</p>
          <p className="auth-footer-text auth-footer-text--farmer">
            <Smartphone size={14} strokeWidth={2} aria-hidden />
            <span>
              {copy.farmerPrompt}{' '}
              {MOBILE_APP_URL ? (
                <a className="auth-link" href={MOBILE_APP_URL} target="_blank" rel="noreferrer">
                  {copy.farmerAction}
                </a>
              ) : (
                copy.farmerAction
              )}
            </span>
          </p>
        </>
      }
    >
      <form onSubmit={onSubmit} className="auth-form" noValidate>
        <AuthField
          label={copy.emailLabel}
          type="email"
          autoComplete="email"
          autoFocus
          inputMode="email"
          placeholder={copy.emailPlaceholder}
          value={form.email}
          onChange={updateField('email')}
          error={errors.email}
        />

        <PasswordField
          label={copy.passwordLabel}
          autoComplete="current-password"
          placeholder={copy.passwordPlaceholder}
          value={form.password}
          onChange={updateField('password')}
          error={errors.password}
          capsLockWarning={copy.capsLockOn}
        />

        <div className="auth-row">
          <label className="auth-checkbox-label">
            <input type="checkbox" checked={form.remember} onChange={updateField('remember')} />
            {copy.rememberMe}
          </label>
          <Link to="/forgot-password" className="auth-link">
            {copy.forgotPassword}
          </Link>
        </div>

        <AuthSubmitButton loading={loading} loadingLabel={copy.submitting}>
          {copy.submit}
        </AuthSubmitButton>

        {failures >= FAILURES_BEFORE_RESET_HINT ? (
          <p className="auth-form-notice" role="status">
            {copy.repeatedFailures}
          </p>
        ) : null}
      </form>
    </AuthLayout>
  )
}

export default LoginPage
