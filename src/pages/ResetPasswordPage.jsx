import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import AuthLayout from '../components/auth/AuthLayout'
import PasswordField from '../components/auth/PasswordField'
import { resetPasswordCopy } from '../constants/authCopy'
import { getAuthErrorMessage, resetPasswordWithToken, validateResetToken } from '../services/auth'
import '../styles/auth.css'

function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')?.trim() || ''
  const copy = resetPasswordCopy

  const [valid, setValid] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) {
      setValid(false)
      return
    }
    validateResetToken(token)
      .then((response) => setValid(Boolean(response?.valid)))
      .catch(() => setValid(false))
  }, [token])

  const onSubmit = async (event) => {
    event.preventDefault()
    if (newPassword.length < 8) {
      toast.warning(copy.passwordMin)
      return
    }
    if (newPassword !== confirmPassword) {
      toast.warning(copy.passwordMismatch)
      return
    }

    setLoading(true)
    try {
      await resetPasswordWithToken({ token, newPassword })
      toast.success(copy.passwordUpdated)
      navigate('/login', { replace: true })
    } catch (error) {
      toast.error(getAuthErrorMessage(error, copy.resetFailed))
    } finally {
      setLoading(false)
    }
  }

  if (valid === null) {
    return (
      <AuthLayout compact title={copy.title} subtitle={copy.validating}>
        <p className="auth-card__subtitle">{copy.validating}</p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      compact
      title={copy.title}
      subtitle={valid ? copy.subtitle : copy.invalidLink}
      footer={
        <p className="auth-footer-text">
          {valid ? (
            <Link to="/login" className="auth-link">
              {copy.backToSignIn}
            </Link>
          ) : (
            <Link to="/forgot-password" className="auth-link">
              {copy.requestNew}
            </Link>
          )}
        </p>
      }
    >
      {valid ? (
        <form onSubmit={onSubmit} className="auth-form">
          <PasswordField
            label={copy.newPasswordLabel}
            required
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />

          <PasswordField
            label={copy.confirmPasswordLabel}
            required
            autoComplete="new-password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />

          <button type="submit" className="auth-btn-primary" disabled={loading}>
            {loading ? 'Updating…' : copy.updatePassword}
          </button>
        </form>
      ) : (
        <Link to="/forgot-password" className="auth-btn-primary auth-btn-primary--link">
          {copy.requestNew}
        </Link>
      )}
    </AuthLayout>
  )
}

export default ResetPasswordPage
