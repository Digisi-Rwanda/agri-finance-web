import { Check, ChevronDown, Shield } from 'lucide-react'
import { evaluatePassword } from '../../utils/passwordPolicy'
import '../../styles/password-strength.css'

const SEGMENTS = [1, 2, 3, 4]

/**
 * Live strength band plus the requirements, kept deliberately short: the rules
 * render as wrapping chips and collapse to one line once they all pass, so the
 * form does not grow tall enough to push the submit button off screen.
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
  const { rules, met, total, score, valid } = evaluatePassword(password, { blocklist })
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

      <p className="pw-strength__head" role="status">
        {hasInput ? (
          <>
            <span className="pw-strength__label">
              {copy.strengthLabel}: {copy.levels[score]}
            </span>
            <span className="pw-strength__count">{copy.progress(met, total)}</span>
          </>
        ) : (
          <span className="pw-strength__count">{copy.requirementsTitle}</span>
        )}
      </p>

      {valid ? (
        <p className="pw-strength__done">
          <Check size={13} strokeWidth={3} aria-hidden />
          <span>{copy.allMet}</span>
        </p>
      ) : (
        <ul className="pw-strength__chips">
          {rules.map((rule) => (
            <li
              key={rule.id}
              className={`pw-strength__chip${rule.met ? ' pw-strength__chip--met' : ''}`}
              title={copy.rules[rule.id]}
            >
              {rule.met ? <Check size={11} strokeWidth={3} aria-hidden /> : null}
              <span>{copy.rulesShort?.[rule.id] || copy.rules[rule.id]}</span>
            </li>
          ))}
        </ul>
      )}

      {showTips && tips.length > 0 ? (
        <details className="pw-strength__tips">
          <summary>
            <Shield size={12} strokeWidth={2.25} aria-hidden />
            <span>{copy.tipsTitle}</span>
            <ChevronDown className="pw-strength__tips-chevron" size={12} strokeWidth={2.5} aria-hidden />
          </summary>
          <ul className="pw-strength__tips-list">
            {tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  )
}
