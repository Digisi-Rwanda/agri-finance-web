import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

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
}) {
  const [visible, setVisible] = useState(false)
  const fieldId = id || `password-${label?.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <label className={`auth-field-group ${className}`.trim()}>
      <span className="auth-label">{label}</span>
      <div className="auth-input-wrap">
        <input
          id={fieldId}
          type={visible ? 'text' : 'password'}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="auth-input auth-input--password"
          value={value}
          onChange={onChange}
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
    </label>
  )
}
