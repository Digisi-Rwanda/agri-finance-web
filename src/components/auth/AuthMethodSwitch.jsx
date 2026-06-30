export default function AuthMethodSwitch({ method, onChange, emailLabel, phoneLabel }) {
  return (
    <div className="auth-method-switch" role="tablist" aria-label="Reset method">
      {[
        { id: 'email', label: emailLabel },
        { id: 'phone', label: phoneLabel },
      ].map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={method === item.id}
          className={`auth-method-switch__btn${method === item.id ? ' auth-method-switch__btn--active' : ''}`}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
