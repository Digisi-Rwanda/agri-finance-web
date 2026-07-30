import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import AuthLayout from '../components/auth/AuthLayout'
import AuthSubmitButton from '../components/auth/AuthSubmitButton'
import PasswordField from '../components/auth/PasswordField'
import { useAuthCopy } from '../context/AuthLocaleContext'
import { getAuthErrorMessage, resetPasswordWithToken, validateResetToken } from '../services/auth'
import '../styles/auth.css'

const MIN_PASSWORD_LENGTH = 8

function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')?.trim() || ''
  const fullCopy = useAuthCopy()
  const copy = fullCopy.resetPassword

  const [valid, setValid] = useState(() => (token ? null : false))
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) return undefined

    let cancelled = false
    validateResetToken(token)
      .then((response) => {
        if (!cancelled) setValid(Boolean(response?.valid))
      })
      .catch(() => {
        if (!cancelled) setValid(false)
      })

    return () => {
      cancelled = true
    }
  }, [token])

  const onSubmit = async (event) => {
    event.preventDefault()

    const nextErrors = {}
    if (newPassword.length < MIN_PASSWORD_LENGTH) nextErrors.newPassword = copy.passwordMin
    if (newPassword !== confirmPassword) nextErrors.confirmPassword = copy.passwordMismatch
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    setErrors({})

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
        <p className="auth-form-notice auth-form-notice--busy" role="status">
          <span className="auth-spinner auth-spinner--brand" aria-hidden />
          {copy.validating}
        </p>
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
        <form onSubmit={onSubmit} className="auth-form" noValidate>
          <PasswordField
            label={copy.newPasswordLabel}
            autoComplete="new-password"
            placeholder={copy.newPasswordPlaceholder}
            value={newPassword}
            onChange={(event) => {
              setNewPassword(event.target.value)
              setErrors({})
            }}
            error={errors.newPassword}
            capsLockWarning={fullCopy.login.capsLockOn}
          />

          <PasswordField
            label={copy.confirmPasswordLabel}
            autoComplete="new-password"
            placeholder={copy.confirmPasswordPlaceholder}
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value)
              setErrors({})
            }}
            error={errors.confirmPassword}
            capsLockWarning={fullCopy.login.capsLockOn}
          />

          <AuthSubmitButton loading={loading} loadingLabel={copy.updating}>
            {copy.updatePassword}
          </AuthSubmitButton>
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
