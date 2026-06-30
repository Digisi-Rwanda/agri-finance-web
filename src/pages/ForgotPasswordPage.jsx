import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import AuthLayout from '../components/auth/AuthLayout'
import AuthMethodSwitch from '../components/auth/AuthMethodSwitch'
import PasswordField from '../components/auth/PasswordField'
import { forgotPasswordCopy } from '../constants/authCopy'
import {
  forgotPasswordByEmail,
  forgotPasswordByPhone,
  getAuthErrorMessage,
  resetPasswordWithCode,
} from '../services/auth'
import {
  formatRwandaPhoneDisplay,
  isValidRwandaMobile,
  normalizeRwandaPhone,
  RWANDA_PHONE_PLACEHOLDER,
} from '../utils/rwandaPhone'
import '../styles/auth.css'

const COOLDOWN_SECONDS = 60

function ForgotPasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const copy = forgotPasswordCopy
  const presetPhone = location.state?.presetPhone || ''

  const [method, setMethod] = useState(presetPhone ? 'phone' : 'email')
  const [step, setStep] = useState('request')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState(presetPhone)
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return undefined
    const timer = window.setInterval(() => {
      setCooldown((value) => (value > 0 ? value - 1 : 0))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  const requestReset = async () => {
    if (method === 'phone' && !isValidRwandaMobile(phone)) {
      toast.warning(copy.invalidPhone)
      return
    }
    if (method === 'email' && !email.trim().includes('@')) {
      toast.warning(copy.invalidEmail)
      return
    }

    setLoading(true)
    try {
      if (method === 'phone') {
        const response = await forgotPasswordByPhone(normalizeRwandaPhone(phone))
        const smsOk = response?.smsSent === true || Boolean(response?.debugResetCode)
        if (!smsOk) {
          toast.error([response?.message, response?.smsError].filter(Boolean).join(' ') || copy.smsFailed)
          return
        }
        if (response?.debugResetCode) {
          toast.info(copy.devCode(response.debugResetCode))
        } else {
          toast.success(response?.message || copy.codeSent)
        }
        setCooldown(COOLDOWN_SECONDS)
        setStep('code')
        return
      }

      const response = await forgotPasswordByEmail(email.trim().toLowerCase())
      setCooldown(COOLDOWN_SECONDS)
      if (response?.emailSent) {
        toast.success(`${response?.message || copy.emailSent}`)
      } else {
        toast.success(response?.message || copy.emailSent)
      }
    } catch (error) {
      toast.error(getAuthErrorMessage(error, copy.resetFailed))
    } finally {
      setLoading(false)
    }
  }

  const submitCodeReset = async (event) => {
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
      if (method === 'phone') {
        await resetPasswordWithCode({
          phone: normalizeRwandaPhone(phone),
          code: resetCode.trim(),
          newPassword,
        })
      } else {
        await resetPasswordWithCode({
          identifier: email.trim().toLowerCase(),
          code: resetCode.trim(),
          newPassword,
        })
      }
      toast.success(copy.passwordUpdated)
      navigate('/login', { replace: true })
    } catch (error) {
      toast.error(getAuthErrorMessage(error, copy.resetFailed))
    } finally {
      setLoading(false)
    }
  }

  const sendLabel =
    cooldown > 0
      ? copy.resendIn(cooldown)
      : method === 'phone'
        ? copy.sendCode
        : copy.sendLink

  return (
    <AuthLayout
      compact
      title={copy.title}
      subtitle={step === 'request' ? copy.subtitle : copy.codeSent}
      footer={
        <p className="auth-footer-text">
          <Link to="/login" className="auth-link">
            {copy.backToSignIn}
          </Link>
        </p>
      }
    >
      {step === 'request' ? (
        <div className="auth-form">
          <AuthMethodSwitch
            method={method}
            onChange={setMethod}
            emailLabel={copy.emailTab}
            phoneLabel={copy.phoneTab}
          />

          {method === 'email' ? (
            <label className="auth-field-group">
              <span className="auth-label">{copy.emailLabel}</span>
              <input
                type="email"
                autoComplete="email"
                placeholder={copy.emailPlaceholder}
                className="auth-input"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
          ) : (
            <label className="auth-field-group">
              <span className="auth-label">{copy.phoneLabel}</span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder={RWANDA_PHONE_PLACEHOLDER}
                className="auth-input"
                value={phone}
                onChange={(event) =>
                  setPhone(formatRwandaPhoneDisplay(normalizeRwandaPhone(event.target.value)))
                }
              />
            </label>
          )}

          <button
            type="button"
            className="auth-btn-primary"
            onClick={requestReset}
            disabled={loading || cooldown > 0}
          >
            {loading ? 'Sending…' : sendLabel}
          </button>
        </div>
      ) : (
        <form onSubmit={submitCodeReset} className="auth-form">
          <label className="auth-field-group">
            <span className="auth-label">{copy.codeLabel}</span>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder={copy.codePlaceholder}
              className="auth-input"
              value={resetCode}
              onChange={(event) => setResetCode(event.target.value)}
            />
          </label>

          <PasswordField
            label={copy.newPasswordLabel}
            autoComplete="new-password"
            placeholder={copy.newPasswordPlaceholder}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />

          <PasswordField
            label={copy.confirmPasswordLabel}
            autoComplete="new-password"
            placeholder={copy.confirmPasswordPlaceholder}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />

          <button type="submit" className="auth-btn-primary" disabled={loading}>
            {loading ? 'Updating…' : copy.updatePassword}
          </button>

          <button
            type="button"
            className="auth-btn-secondary auth-btn-secondary--block"
            onClick={() => setStep('request')}
          >
            {method === 'phone' ? copy.sendCode : copy.sendLink}
          </button>
        </form>
      )}
    </AuthLayout>
  )
}

export default ForgotPasswordPage
