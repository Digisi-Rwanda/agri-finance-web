import { Moon, Sun } from 'lucide-react'
import { usePortalCopy } from '../../context/AuthLocaleContext'

/** Light / Dark theme picker in the header. */
function ThemeSwitch({ isDark, onChange }) {
  const portal = usePortalCopy()
  const theme = portal.pages?.theme || portal.theme || {}

  return (
    <div className="theme-switch" role="group" aria-label={theme.ariaLabel || 'Color theme'}>
      <button
        type="button"
        className={`theme-switch__btn ${!isDark ? 'theme-switch__btn--active' : ''}`}
        onClick={() => onChange(false)}
        aria-pressed={!isDark}
        title={theme.lightTitle || theme.light || 'Light mode'}
      >
        <Sun size={14} />
        <span>{theme.light || 'Light'}</span>
      </button>
      <button
        type="button"
        className={`theme-switch__btn ${isDark ? 'theme-switch__btn--active' : ''}`}
        onClick={() => onChange(true)}
        aria-pressed={isDark}
        title={theme.darkTitle || theme.dark || 'Dark mode'}
      >
        <Moon size={14} />
        <span>{theme.dark || 'Dark'}</span>
      </button>
    </div>
  )
}

export default ThemeSwitch
