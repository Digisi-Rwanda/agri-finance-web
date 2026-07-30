import { AlertCircle } from 'lucide-react'

/** Inline validation message; kept mounted-on-demand so it announces when it appears. */
export default function AuthFieldError({ id, message }) {
  if (!message) return null

  return (
    <p className="auth-field-error" id={id} role="alert">
      <AlertCircle size={13} strokeWidth={2.25} aria-hidden />
      <span>{message}</span>
    </p>
  )
}
