import { Moon, Sun } from 'lucide-react'

/** Light / Dark theme picker in the header. */
function ThemeSwitch({ isDark, onChange }) {
  return (
    <div className="theme-switch" role="group" aria-label="Color theme">
      <button
        type="button"
        className={`theme-switch__btn ${!isDark ? 'theme-switch__btn--active' : ''}`}
        onClick={() => onChange(false)}
        aria-pressed={!isDark}
        title="Light mode"
      >
        <Sun size={14} />
        <span>Light</span>
      </button>
      <button
        type="button"
        className={`theme-switch__btn ${isDark ? 'theme-switch__btn--active' : ''}`}
        onClick={() => onChange(true)}
        aria-pressed={isDark}
        title="Dark mode"
      >
        <Moon size={14} />
        <span>Dark</span>
      </button>
    </div>
  )
}

export default ThemeSwitch
