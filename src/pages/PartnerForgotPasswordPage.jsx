import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import AuthField from '../components/auth/AuthField'
import AuthLayout from '../components/auth/AuthLayout'
import AuthSubmitButton from '../components/auth/AuthSubmitButton'
import { useAuthCopy } from '../context/AuthLocaleContext'
import { forgotPasswordByEmail, getAuthErrorMessage } from '../services/auth'
import '../styles/auth.css'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function PartnerForgotPasswordPage() {
  const copy = useAuthCopy().forgotPassword
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const onSubmit = async (event) => {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError(copy.invalidEmail)
      return
    }
    setError('')

    setLoading(true)
    try {
      await forgotPasswordByEmail(normalizedEmail)
      setSent(true)
      toast.success(copy.emailSent)
    } catch (requestError) {
      toast.error(getAuthErrorMessage(requestError, copy.resetFailed))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      compact
      title={copy.title}
      subtitle={sent ? copy.partnerSentSubtitle : copy.partnerSubtitle}
      footer={
        <p className="auth-footer-text">
          <Link to="/login" className="auth-link">
            {copy.backToSignIn}
          </Link>
        </p>
      }
    >
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <AuthField
          label={copy.emailLabel}
          type="email"
          autoComplete="email"
          autoFocus
          inputMode="email"
          placeholder={copy.emailPlaceholder}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            if (error) setError('')
          }}
          error={error}
        />

        <AuthSubmitButton loading={loading} loadingLabel={copy.sending}>
          {sent ? copy.sendAnotherLink : copy.sendLink}
        </AuthSubmitButton>
      </form>
    </AuthLayout>
  )
}

export default PartnerForgotPasswordPage
