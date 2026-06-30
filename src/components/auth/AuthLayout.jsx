import { Leaf } from 'lucide-react'
import { authBrand } from '../../constants/authCopy'
import AuthIllustration from './AuthIllustration'

export default function AuthLayout({ title, subtitle, footer, children, compact = false }) {
  return (
    <section className="auth-page">
      <div className="auth-split">
        <div className="auth-form-panel">
          <div className={`auth-form-center${compact ? ' auth-form-center--compact' : ''}`}>
            <div className={`auth-card${compact ? ' auth-card--compact' : ''}`}>
              <header className="auth-card__header">
                <div className="auth-brand-inline">
                  <div className="auth-avatar" aria-hidden>
                    <Leaf size={18} strokeWidth={2.25} />
                  </div>
                  <div className="auth-brand-text">
                    <span className="auth-brand-name">{authBrand.name}</span>
                    <span className="auth-brand-tag">{authBrand.tagline}</span>
                  </div>
                </div>
                <h1 className="auth-card__title">{title}</h1>
                {subtitle ? <p className="auth-card__subtitle">{subtitle}</p> : null}
              </header>

              {children}

              {footer ? <div className="auth-footer">{footer}</div> : null}
            </div>
          </div>
        </div>
        <AuthIllustration />
      </div>
    </section>
  )
}
