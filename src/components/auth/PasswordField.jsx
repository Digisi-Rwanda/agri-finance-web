import { Eye, EyeOff } from 'lucide-react'
import { useId, useState } from 'react'
import AuthFieldError from './AuthFieldError'

export default function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  autoComplete = 'current-password',
  required = false,
  minLength,
  className = '',
  id,
  error,
  /** Shown while Caps Lock is detected; omit to disable the check. */
  capsLockWarning,
}) {
  const generatedId = useId()
  const [visible, setVisible] = useState(false)
  const [capsLock, setCapsLock] = useState(false)

  const fieldId = id || `auth-password-${generatedId}`
  const errorId = `${fieldId}-error`
  const capsId = `${fieldId}-caps`
  const showCaps = Boolean(capsLockWarning) && capsLock
  const describedBy = [error && errorId, showCaps && capsId].filter(Boolean).join(' ')

  const trackCapsLock = (event) => {
    if (!capsLockWarning || typeof event.getModifierState !== 'function') return
    setCapsLock(event.getModifierState('CapsLock'))
  }

  return (
    <div className={`auth-field-group ${className}`.trim()}>
      <label className="auth-label" htmlFor={fieldId}>
        {label}
      </label>
      <div className="auth-input-wrap">
        <input
          id={fieldId}
          type={visible ? 'text' : 'password'}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={`auth-input auth-input--password${error ? ' auth-input--invalid' : ''}`}
          value={value}
          onChange={onChange}
          onKeyUp={trackCapsLock}
          onKeyDown={trackCapsLock}
          onBlur={() => setCapsLock(false)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
        />
        <button
          type="button"
          className="auth-password-toggle"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          aria-controls={fieldId}
        >
          {visible ? <EyeOff size={17} strokeWidth={2} /> : <Eye size={17} strokeWidth={2} />}
        </button>
      </div>
      {showCaps ? (
        <p className="auth-field-hint auth-field-hint--warn" id={capsId} role="status">
          {capsLockWarning}
        </p>
      ) : null}
      <AuthFieldError id={errorId} message={error} />
    </div>
  )
}
