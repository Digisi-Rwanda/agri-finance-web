import { Check, Circle, Shield } from 'lucide-react'
import { evaluatePassword } from '../../utils/passwordPolicy'
import '../../styles/password-strength.css'

const SEGMENTS = [1, 2, 3, 4]

/**
 * Live strength band plus the full requirements checklist.
 *
 * @param blocklist personal values (email, name) the password must not contain
 * @param copy      the `passwordPolicy` copy tree for the active locale
 * @param showTips  hygiene tips (reuse, password manager, 2FA). Default true.
 */
export default function PasswordStrength({
  password = '',
  blocklist = [],
  copy,
  id,
  showTips = true,
}) {
  const { rules, met, total, score } = evaluatePassword(password, { blocklist })
  const hasInput = password.length > 0
  const tips = Array.isArray(copy.tips) ? copy.tips : []

  return (
    <div className={`pw-strength pw-strength--${hasInput ? score : 0}`} id={id}>
      <div className="pw-strength__bar" aria-hidden>
        {SEGMENTS.map((segment) => (
          <span
            key={segment}
            className={`pw-strength__seg${hasInput && segment <= score ? ' pw-strength__seg--on' : ''}`}
          />
        ))}
      </div>

      {hasInput ? (
        <p className="pw-strength__head" role="status">
          <span className="pw-strength__label">
            {copy.strengthLabel}: {copy.levels[score]}
          </span>
          <span className="pw-strength__count">{copy.progress(met, total)}</span>
        </p>
      ) : (
        <p className="pw-strength__head">
          <span className="pw-strength__count">{copy.requirementsTitle}</span>
        </p>
      )}

      <ul className="pw-strength__list">
        {rules.map((rule) => (
          <li
            key={rule.id}
            className={`pw-strength__item${rule.met ? ' pw-strength__item--met' : ''}`}
          >
            {rule.met ? (
              <Check size={13} strokeWidth={3} aria-hidden />
            ) : (
              <Circle size={13} strokeWidth={2} aria-hidden />
            )}
            <span>{copy.rules[rule.id]}</span>
          </li>
        ))}
      </ul>

      {showTips && tips.length > 0 ? (
        <div className="pw-strength__tips">
          <p className="pw-strength__tips-title">
            <Shield size={13} strokeWidth={2.25} aria-hidden />
            <span>{copy.tipsTitle}</span>
          </p>
          <ul className="pw-strength__tips-list">
            {tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
