/**
 * Primary auth action. While `loading` the button keeps its width, swaps in a
 * spinner and announces the pending label instead of only changing text.
 */
export default function AuthSubmitButton({
  children,
  loadingLabel,
  loading = false,
  disabled = false,
  type = 'submit',
  onClick,
}) {
  return (
    <button
      type={type}
      className="auth-btn-primary"
      onClick={onClick}
      disabled={loading || disabled}
      aria-busy={loading || undefined}
    >
      {loading ? <span className="auth-spinner" aria-hidden /> : null}
      <span>{loading ? loadingLabel || children : children}</span>
    </button>
  )
}
