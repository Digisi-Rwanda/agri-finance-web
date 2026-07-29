import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import AuthLayout from '../components/auth/AuthLayout'
import PasswordField from '../components/auth/PasswordField'
import { loginCopy } from '../constants/authCopy'
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

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const prefill = location.state?.prefill
  const copy = loginCopy
  const [form, setForm] = useState({
    email: prefill?.email || '',
    password: '',
    remember: false,
  })
  const [loading, setLoading] = useState(false)

  const onSubmit = async (event) => {
    event.preventDefault()
    const email = form.email.trim().toLowerCase()
    if (!email.includes('@')) {
      toast.warning(copy.partnerEmailRequired)
      return
    }

    setLoading(true)
    try {
      const { user } = await loginUser({ identifier: email, password: form.password, remember: form.remember })
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
      toast.error(getAuthErrorMessage(error, copy.toastError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      compact
      title={copy.partnerTitle}
      subtitle={copy.partnerSubtitle}
      footer={
        <p className="auth-footer-text">
          {copy.partnerAccessHelp}
        </p>
      }
    >
      <form onSubmit={onSubmit} className="auth-form">
        <label className="auth-field-group">
          <span className="auth-label">{copy.emailLabel}</span>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder={copy.emailPlaceholder}
            className="auth-input"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
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
