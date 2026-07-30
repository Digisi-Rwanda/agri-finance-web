import { useId } from 'react'
import AuthFieldError from './AuthFieldError'

export default function AuthField({
  label,
  error,
  hint,
  id,
  className = '',
  inputRef,
  ...inputProps
}) {
  const generatedId = useId()
  const fieldId = id || `auth-field-${generatedId}`
  const errorId = `${fieldId}-error`
  const hintId = `${fieldId}-hint`
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ')

  return (
    <div className={`auth-field-group ${className}`.trim()}>
      <label className="auth-label" htmlFor={fieldId}>
        {label}
      </label>
      <input
        {...inputProps}
        id={fieldId}
        ref={inputRef}
        className={`auth-input${error ? ' auth-input--invalid' : ''}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
      />
      {hint ? (
        <p className="auth-field-hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      <AuthFieldError id={errorId} message={error} />
    </div>
  )
}
