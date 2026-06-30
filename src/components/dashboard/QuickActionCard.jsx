import { Link } from 'react-router-dom'

/** Shortcut tile used at the bottom of the dashboard. */
function QuickActionCard({ to, title, description, icon: Icon }) {
  return (
    <Link to={to} className="quick-action-card">
      <span className="quick-action-card__icon">{Icon ? <Icon size={18} /> : null}</span>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
    </Link>
  )
}

export default QuickActionCard
