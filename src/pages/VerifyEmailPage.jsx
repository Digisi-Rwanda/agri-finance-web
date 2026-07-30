import { CheckCircle2, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AuthLayout from '../components/auth/AuthLayout'
import { useAuthCopy } from '../context/AuthLocaleContext'
import { getAuthErrorMessage, verifyEmailWithToken } from '../services/auth'
import '../styles/auth.css'

function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')?.trim() || ''
  const copy = useAuthCopy().verifyEmail
  const [status, setStatus] = useState(token ? 'loading' : 'missing')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!token) return

    let cancelled = false
    verifyEmailWithToken(token)
      .then(() => {
        if (!cancelled) setStatus('success')
      })
      .catch((error) => {
        if (!cancelled) {
          setStatus('error')
          setErrorMessage(getAuthErrorMessage(error, copy.failed))
        }
      })

    return () => {
      cancelled = true
    }
  }, [token, copy.failed])

  const backToSignIn = (
    <p className="auth-footer-text">
      <Link to="/login" className="auth-link">
        {copy.backToSignIn}
      </Link>
    </p>
  )

  if (status === 'loading') {
    return (
      <AuthLayout compact title={copy.title} subtitle={copy.verifying}>
        <p className="auth-form-notice auth-form-notice--busy" role="status">
          <span className="auth-spinner auth-spinner--brand" aria-hidden />
          {copy.verifying}
        </p>
      </AuthLayout>
    )
  }

  const failureMessage = status === 'missing' ? copy.missingLink : errorMessage || copy.failed

  return (
    <AuthLayout
      compact
      title={copy.title}
      subtitle={status === 'success' ? copy.success : failureMessage}
      footer={backToSignIn}
    >
      <p
        className={`auth-result ${status === 'success' ? 'auth-result--success' : 'auth-result--error'}`}
        role="status"
      >
        {status === 'success' ? (
          <CheckCircle2 size={16} strokeWidth={2.25} aria-hidden />
        ) : (
          <XCircle size={16} strokeWidth={2.25} aria-hidden />
        )}
        <span>{status === 'success' ? copy.success : failureMessage}</span>
      </p>

      <Link to="/login" className="auth-btn-primary auth-btn-primary--link">
        {copy.backToSignIn}
      </Link>
    </AuthLayout>
  )
}

export default VerifyEmailPage
