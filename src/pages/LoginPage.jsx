import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import AuthLayout from '../components/auth/AuthLayout'
import PasswordField from '../components/auth/PasswordField'
import { loginCopy } from '../constants/authCopy'
import { loginUser } from '../services/auth'
import { getHomePathForRole } from '../utils/roles'
import '../styles/auth.css'

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const prefill = location.state?.prefill
  const copy = loginCopy
  const [form, setForm] = useState({
    email: prefill?.email || '',
    password: prefill?.password || '',
    remember: false,
  })

  const onSubmit = async (event) => {
    event.preventDefault()
    try {
      const { user } = await loginUser({ email: form.email, password: form.password, remember: form.remember })
      toast.success(copy.toastSuccess)
      const from = location.state?.from?.pathname
      const destination = from && from !== '/login' ? from : getHomePathForRole(user.role)
      navigate(destination, { replace: true })
    } catch {
      toast.error(copy.toastError)
    }
  }

  return (
    <AuthLayout
      compact
      title={copy.title}
      subtitle={copy.subtitle}
      footer={
        <p className="auth-footer-text">
          {copy.footerPrompt}{' '}
          <Link to="/register" className="auth-link">
            {copy.footerAction}
          </Link>
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

        <button type="submit" className="auth-btn-primary">
          {copy.submit}
        </button>
      </form>
    </AuthLayout>
  )
}

export default LoginPage
