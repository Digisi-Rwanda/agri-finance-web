import { Globe } from 'lucide-react'
import { useAuthCopy, useAuthLocale } from '../../context/AuthLocaleContext'

/** EN / FR / RW toggle for the signed-in portal top bar (RW uses English portal copy). */
export default function PortalLanguageSwitcher({ className = '' }) {
  const { locale, setLocale } = useAuthLocale()
  const copy = useAuthCopy().language

  return (
    <div className={`portal-lang ${className}`.trim()} role="group" aria-label={copy.label}>
      <Globe size={14} strokeWidth={2} aria-hidden />
      {copy.options.map((option) => (
        <button
          key={option.code}
          type="button"
          lang={option.code}
          className={`portal-lang__btn${option.code === locale ? ' portal-lang__btn--active' : ''}`}
          aria-pressed={option.code === locale}
          title={option.label}
          onClick={() => setLocale(option.code)}
        >
          {option.short}
          <span className="auth-sr-only">{` ${option.label}`}</span>
        </button>
      ))}
    </div>
  )
}
