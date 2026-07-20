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
    institution: '',
    phone: '',
    role: 'BANK',
    password: '',
    accepted: false,
  })

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
    if (form.role === 'FARMER') {
      if (!isValidRwandaMobile(form.phone)) {
        toast.warning(copy.toastPhoneInvalid)
        return
      }
    }
    try {
      const result = await registerUser({
        ...form,
        phone: form.role === 'FARMER' ? normalizeRwandaPhone(form.phone) : undefined,
      })
      if (result?.requiresEmailVerification) {
        toast.success(result.message || copy.toastVerifyEmail)
        navigate('/login', { replace: true, state: { prefill: { email: form.email } } })
        return
      }
      toast.success(copy.toastSuccess)
      navigate('/login', {
        replace: true,
        state: { prefill: { email: form.email, password: form.password } },
      })
    } catch (error) {
      toast.error(getAuthErrorMessage(error, copy.toastError))
    }
  }

  const isFarmer = form.role === 'FARMER'

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

        {isFarmer ? (
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
        ) : (
          <label className="auth-field-group">
            <span className="auth-label">{copy.organizationLabel}</span>
            <input
              required
              autoComplete="organization"
              placeholder={copy.organizationPlaceholder}
              className="auth-input"
              value={form.institution}
              onChange={(event) => setForm((prev) => ({ ...prev, institution: event.target.value }))}
            />
          </label>
        )}

        <label className="auth-field-group">
          <span className="auth-label">{copy.roleLabel}</span>
          <select
            className="auth-select"
            value={form.role}
            onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
          >
            <option value="BANK">{copy.roles.BANK}</option>
            <option value="INSURER">{copy.roles.INSURER}</option>
            <option value="COOPERATIVE">{copy.roles.COOPERATIVE || 'Cooperative'}</option>
            <option value="FARMER">{copy.roles.FARMER}</option>
          </select>
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
          {copy.terms}
        </label>

        <button type="submit" className="auth-btn-primary auth-field-group--full">
          {copy.submit}
        </button>
      </form>
    </AuthLayout>
  )
}

export default RegisterPage
