import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import AuthLayout from '../components/auth/AuthLayout'
import PasswordField from '../components/auth/PasswordField'
import { registerCopy } from '../constants/authCopy'
import { getAuthErrorMessage, registerUser } from '../services/auth'
import {
  formatRwandaPhoneDisplay,
  isValidRwandaMobile,
  normalizeRwandaPhone,
  RWANDA_PHONE_PLACEHOLDER,
} from '../utils/rwandaPhone'
import '../styles/auth.css'

function RegisterPage() {
  const navigate = useNavigate()
  const copy = registerCopy
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    accepted: false,
  })
  const [loading, setLoading] = useState(false)

  const onSubmit = async (event) => {
    event.preventDefault()
    if (!form.accepted) {
      toast.warning(copy.toastTerms)
      return
    }
    if (form.password.length < 8) {
      toast.warning(copy.toastPasswordMin)
      return
    }
    if (!isValidRwandaMobile(form.phone)) {
      toast.warning(copy.toastPhoneInvalid)
      return
    }
    setLoading(true)
    try {
      const result = await registerUser({
        ...form,
        role: 'FARMER',
        phone: normalizeRwandaPhone(form.phone),
      })
      if (result?.requiresEmailVerification) {
        toast.success(result.message || copy.toastVerifyEmail)
        navigate('/login', { replace: true, state: { prefill: { email: form.email } } })
        return
      }
      toast.success(copy.toastSuccess)
      navigate('/login', {
        replace: true,
        state: { prefill: { email: form.email } },
      })
    } catch (error) {
      toast.error(getAuthErrorMessage(error, copy.toastError))
    } finally {
      setLoading(false)
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
          <Link to="/login" className="auth-link">
            {copy.footerAction}
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} className="auth-form auth-form--grid">
        <label className="auth-field-group">
          <span className="auth-label">{copy.fullNameLabel}</span>
          <input
            required
            autoComplete="name"
            placeholder={copy.fullNamePlaceholder}
            className="auth-input"
            value={form.fullName}
            onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
          />
        </label>

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

        <label className="auth-field-group">
          <span className="auth-label">{copy.phoneLabel}</span>
          <input
            type="tel"
            required
            autoComplete="tel"
            placeholder={RWANDA_PHONE_PLACEHOLDER}
            className="auth-input"
            value={form.phone}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, phone: formatRwandaPhoneDisplay(event.target.value) }))
            }
          />
        </label>

        <PasswordField
          className="auth-field-group--full"
          label={copy.passwordLabel}
          required
          minLength={8}
          autoComplete="new-password"
          placeholder={copy.passwordPlaceholder}
          value={form.password}
          onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
        />

        <label className="auth-checkbox-label auth-field-group--full">
          <input
            type="checkbox"
            checked={form.accepted}
            onChange={(event) => setForm((prev) => ({ ...prev, accepted: event.target.checked }))}
          />
          <span>
            I accept the{' '}
            <a className="auth-link" href="/terms" target="_blank" rel="noreferrer">
              Terms of Service
            </a>{' '}
            and{' '}
            <a className="auth-link" href="/privacy" target="_blank" rel="noreferrer">
              Privacy Policy
            </a>
            .
          </span>
        </label>

        <button
          type="submit"
          className="auth-btn-primary auth-field-group--full"
          disabled={loading}
        >
          {loading ? copy.submitting : copy.submit}
        </button>
      </form>
    </AuthLayout>
  )
}

export default RegisterPage
