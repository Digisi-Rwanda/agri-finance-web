import authFieldBg from '../../assets/auth-field-bg.webp'
import { useAuthCopy } from '../../context/AuthLocaleContext'

export default function AuthIllustration() {
  const copy = useAuthCopy().illustration

  return (
    <aside className="auth-illustration">
      {/* Decorative: the panel's meaning lives in the text below, so alt stays empty. */}
      <img
        src={authFieldBg}
        alt=""
        className="auth-illustration__bg"
        fetchPriority="high"
        decoding="async"
      />
      <div className="auth-illustration__overlay" />
      <div className="auth-illustration__content">
        <p className="auth-illustration__eyebrow">{copy.eyebrow}</p>
        <h2 className="auth-illustration__headline">{copy.headline}</h2>
        <p className="auth-illustration__body">{copy.body}</p>
        <ul className="auth-illustration__stats">
          {copy.stats.map((stat) => (
            <li key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
