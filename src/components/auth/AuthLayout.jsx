import { ShieldCheck } from 'lucide-react'
import authFieldBg from '../../assets/auth-field-bg.webp'
import { useAuthCopy } from '../../context/AuthLocaleContext'
import AgriTrustMark from '../ui/AgriTrustMark'
import AuthIllustration from './AuthIllustration'
import LanguageSwitcher from './LanguageSwitcher'

const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || 'support@agritrust.rw'
const SUPPORT_URL = import.meta.env.VITE_SUPPORT_URL || '/support'
const TERMS_URL = import.meta.env.VITE_TERMS_URL || '/terms'
const PRIVACY_URL = import.meta.env.VITE_PRIVACY_URL || '/privacy'
const APP_VERSION = __APP_VERSION__

export default function AuthLayout({ title, subtitle, eyebrow, footer, children, compact = false }) {
  const copy = useAuthCopy()
  const brand = copy.brand
  const security = copy.security
  const legalLinks = [
    TERMS_URL && { href: TERMS_URL, label: security.terms },
    PRIVACY_URL && { href: PRIVACY_URL, label: security.privacy },
    SUPPORT_URL && { href: SUPPORT_URL, label: security.support },
  ].filter(Boolean)

  return (
    <section className="auth-page">
      <div className="auth-split">
        {/* Carries the brand through on viewports where the photo panel is hidden. */}
        <div className="auth-mobile-banner">
          <img src={authFieldBg} alt="" className="auth-mobile-banner__bg" decoding="async" />
          <div className="auth-mobile-banner__content">
            <AgriTrustMark size={18} />
            <span>{brand.name}</span>
          </div>
        </div>

        <div className="auth-form-panel">
          <div className={`auth-form-center${compact ? ' auth-form-center--compact' : ''}`}>
            <div className="auth-topbar">
              <div className="auth-brand-inline">
                <div className="auth-avatar">
                  <AgriTrustMark size={19} />
                </div>
                <div className="auth-brand-text">
                  <span className="auth-brand-name">{brand.name}</span>
                  <span className="auth-brand-tag">{brand.tagline}</span>
                </div>
              </div>
              <LanguageSwitcher />
            </div>

            <div className={`auth-card${compact ? ' auth-card--compact' : ''}`}>
              <header className="auth-card__header">
                {eyebrow ? <p className="auth-card__eyebrow">{eyebrow}</p> : null}
                <h1 className="auth-card__title">{title}</h1>
                {subtitle ? <p className="auth-card__subtitle">{subtitle}</p> : null}
              </header>

              {children}

              <p className="auth-security-note">
                <ShieldCheck size={14} strokeWidth={2} aria-hidden />
                <span>{security.note}</span>
              </p>

              {footer ? <div className="auth-footer">{footer}</div> : null}
            </div>

            <div className="auth-meta">
              {SUPPORT_EMAIL ? (
                <span className="auth-meta__support">
                  {security.supportPrompt}{' '}
                  <a className="auth-link" href={`mailto:${SUPPORT_EMAIL}`}>
                    {security.supportAction}
                  </a>
                </span>
              ) : null}
              <span className="auth-meta__legal">
                {legalLinks.map((link) => (
                  <a
                    key={link.href}
                    className="auth-link"
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {link.label}
                  </a>
                ))}
                <span className="auth-meta__version">{security.versionLabel(APP_VERSION)}</span>
              </span>
            </div>
          </div>
        </div>
        <AuthIllustration />
      </div>
    </section>
  )
}
