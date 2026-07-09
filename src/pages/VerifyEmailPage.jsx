import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AuthLayout from '../components/auth/AuthLayout'
import { verifyEmailCopy } from '../constants/authCopy'
import { getAuthErrorMessage, verifyEmailWithToken } from '../services/auth'

function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')?.trim() || ''
  const copy = verifyEmailCopy
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

  if (status === 'loading') {
    return (
      <AuthLayout compact title={copy.title} subtitle={copy.verifying}>
        <p className="auth-card__subtitle">{copy.verifying}</p>
      </AuthLayout>
    )
  }

  if (status === 'missing') {
    return (
      <AuthLayout
        compact
        title={copy.title}
        subtitle={copy.missingLink}
        footer={
          <p className="auth-footer-text">
            <Link to="/login" className="auth-link">
              {copy.backToSignIn}
            </Link>
          </p>
        }
      >
        <Link to="/login" className="auth-btn-primary auth-btn-primary--link">
          {copy.backToSignIn}
        </Link>
      </AuthLayout>
    )
  }

  if (status === 'success') {
    return (
      <AuthLayout
        compact
        title={copy.title}
        subtitle={copy.success}
        footer={
          <p className="auth-footer-text">
            <Link to="/login" className="auth-link">
              {copy.backToSignIn}
            </Link>
          </p>
        }
      >
        <Link to="/login" className="auth-btn-primary auth-btn-primary--link">
          {copy.backToSignIn}
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      compact
      title={copy.title}
      subtitle={errorMessage || copy.failed}
      footer={
        <p className="auth-footer-text">
          <Link to="/login" className="auth-link">
            {copy.backToSignIn}
          </Link>
        </p>
      }
    >
      <p className="auth-card__subtitle">{errorMessage || copy.failed}</p>
    </AuthLayout>
  )
}

export default VerifyEmailPage
