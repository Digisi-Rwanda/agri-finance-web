import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import AuthLayout from '../components/auth/AuthLayout'
import { forgotPasswordCopy } from '../constants/authCopy'
import { forgotPasswordByEmail, getAuthErrorMessage } from '../services/auth'
import '../styles/auth.css'

function PartnerForgotPasswordPage() {
  const copy = forgotPasswordCopy
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const onSubmit = async (event) => {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail.includes('@')) {
      toast.warning(copy.invalidEmail)
      return
    }

    setLoading(true)
    try {
      await forgotPasswordByEmail(normalizedEmail)
      setSent(true)
      toast.success(copy.emailSent)
    } catch (error) {
      toast.error(getAuthErrorMessage(error, copy.resetFailed))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      compact
      title={copy.title}
      subtitle={
        sent
          ? 'If the account exists, a secure reset link has been sent.'
          : 'Enter your partner account email to receive a secure reset link.'
      }
      footer={
        <p className="auth-footer-text">
          <Link to="/login" className="auth-link">
            {copy.backToSignIn}
          </Link>
        </p>
      }
    >
      <form className="auth-form" onSubmit={onSubmit}>
        <label className="auth-field-group">
          <span className="auth-label">{copy.emailLabel}</span>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder={copy.emailPlaceholder}
            className="auth-input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <button type="submit" className="auth-btn-primary" disabled={loading}>
          {loading ? 'Sending…' : sent ? 'Send another link' : copy.sendLink}
        </button>
      </form>
    </AuthLayout>
  )
}

export default PartnerForgotPasswordPage
