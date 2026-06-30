import authFieldBg from '../../assets/auth-field-bg.png'
import { authIllustration } from '../../constants/authCopy'

export default function AuthIllustration() {
  return (
    <aside className="auth-illustration" aria-hidden>
      <img src={authFieldBg} alt="" className="auth-illustration__bg" />
      <div className="auth-illustration__overlay" />
      <div className="auth-illustration__content">
        <p className="auth-illustration__eyebrow">{authIllustration.eyebrow}</p>
        <h2 className="auth-illustration__headline">{authIllustration.headline}</h2>
        <p className="auth-illustration__body">{authIllustration.body}</p>
        <div className="auth-illustration__stats">
          {authIllustration.stats.map((stat) => (
            <div key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
