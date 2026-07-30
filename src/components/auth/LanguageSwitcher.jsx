import { Globe } from 'lucide-react'
import { useAuthCopy, useAuthLocale } from '../../context/AuthLocaleContext'

export default function LanguageSwitcher() {
  const { locale, setLocale } = useAuthLocale()
  const copy = useAuthCopy().language

  return (
    <div className="auth-lang" role="group" aria-label={copy.label}>
      <Globe size={14} strokeWidth={2} aria-hidden />
      {copy.options.map((option) => (
        <button
          key={option.code}
          type="button"
          lang={option.code}
          className={`auth-lang__btn${option.code === locale ? ' auth-lang__btn--active' : ''}`}
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
