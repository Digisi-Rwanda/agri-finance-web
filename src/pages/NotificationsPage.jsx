import {
  Bell,
  CheckCheck,
  CircleCheckBig,
  HandCoins,
  ScrollText,
  Settings,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { usePageCopy } from '../context/AuthLocaleContext'
import { getNotifications } from '../services/notificationService'

const READ_KEY = 'agri_finance_notification_read'

function loadReadIds() {
  try {
    const raw = localStorage.getItem(READ_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

function saveReadIds(ids) {
  localStorage.setItem(READ_KEY, JSON.stringify([...ids]))
}

function typeIcon(type) {
  if (type === 'loan') return HandCoins
  if (type === 'system') return ScrollText
  return Bell
}

function NotificationsPage() {
  const { s, p, layout } = usePageCopy('notifications')
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [readIds, setReadIds] = useState(loadReadIds)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const filters = useMemo(
    () => [
      { id: 'all', label: p.filterAll },
      { id: 'unread', label: p.filterUnread },
      { id: 'loan', label: p.filterLoans },
      { id: 'system', label: p.filterSystem },
    ],
    [p.filterAll, p.filterLoans, p.filterSystem, p.filterUnread],
  )

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setLoadError('')
      try {
        const data = await getNotifications()
        setItems(Array.isArray(data) ? data : [])
      } catch {
        setLoadError(p.loadFailed)
        setItems([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [p.loadFailed])

  const enriched = useMemo(
    () => items.map((item) => ({ ...item, read: readIds.has(item.id) })),
    [items, readIds],
  )

  const filtered = useMemo(() => {
    if (filter === 'unread') return enriched.filter((item) => !item.read)
    if (filter === 'loan' || filter === 'system') {
      return enriched.filter((item) => item.type === filter)
    }
    return enriched
  }, [enriched, filter])

  const unreadCount = enriched.filter((item) => !item.read).length

  const markAsRead = (id) => {
    setReadIds((current) => {
      const next = new Set(current)
      next.add(id)
      saveReadIds(next)
      return next
    })
  }

  const markAllRead = () => {
    setReadIds((current) => {
      const next = new Set(current)
      enriched.forEach((item) => next.add(item.id))
      saveReadIds(next)
      return next
    })
    toast.success(p.markedAllRead)
  }

  const openItem = (item) => {
    if (!item.read) markAsRead(item.id)
    if (item.href) navigate(item.href)
  }

  return (
    <section className="dashboard-page dashboard-page--compact notifications-page">
      <div className="account-toolbar">
        <div>
          <nav className="account-toolbar__crumb" aria-label="Breadcrumb">
            <Link to="/">{layout.breadcrumbHome || s.home}</Link>
            <span aria-hidden>/</span>
            <span>{p.title}</span>
          </nav>
          <h1>{p.title}</h1>
        </div>
        <div className="account-toolbar__actions">
          {unreadCount > 0 ? (
            <button type="button" className="btn-secondary" onClick={markAllRead}>
              <CheckCheck size={16} />
              {p.markAllRead}
            </button>
          ) : null}
          <Link to="/settings" className="btn-secondary">
            <Settings size={16} />
            {p.preferences}
          </Link>
        </div>
      </div>

      <div className="notifications-summary">
        <div className="notifications-summary__stat">
          <small>{p.total}</small>
          <strong>{loading ? '…' : enriched.length}</strong>
        </div>
        <div className="notifications-summary__stat">
          <small>{p.unread}</small>
          <strong>{loading ? '…' : unreadCount}</strong>
        </div>
        <div className="notifications-summary__stat">
          <small>{p.loans}</small>
          <strong>
            {loading ? '…' : enriched.filter((item) => item.type === 'loan').length}
          </strong>
        </div>
      </div>

      <div className="notifications-filters" role="tablist" aria-label={p.filterLabel}>
        {filters.map((option) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={filter === option.id}
            className={`filter-chip${filter === option.id ? ' filter-chip--active' : ''}`}
            onClick={() => setFilter(option.id)}
          >
            {option.label}
            {option.id === 'unread' && unreadCount > 0 ? (
              <span className="notifications-filters__count">{unreadCount}</span>
            ) : null}
          </button>
        ))}
      </div>

      {loadError ? <article className="card account-alert">{loadError}</article> : null}

      {loading ? (
        <div className="notification-list">
          {[1, 2, 3, 4].map((id) => (
            <article key={id} className="notification-item notification-item--skeleton" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <article className="card notifications-empty">
          <Bell size={32} strokeWidth={1.5} />
          <h2>{enriched.length === 0 ? p.emptyTitle : p.filterEmptyTitle}</h2>
          <p>{enriched.length === 0 ? p.emptyBody : p.filterEmptyBody}</p>
        </article>
      ) : (
        <div className="notification-list">
          {filtered.map((item) => {
            const Icon = typeIcon(item.type)
            return (
              <article
                key={item.id}
                className={`notification-item notification-item--${item.tone || 'neutral'}${
                  item.read ? ' notification-item--read' : ' notification-item--unread'
                }`}
              >
                <button
                  type="button"
                  className="notification-item__main"
                  onClick={() => openItem(item)}
                >
                  <span
                    className={`notification-item__icon notification-item__icon--${item.tone || 'neutral'}`}
                  >
                    <Icon size={18} />
                  </span>
                  <div className="notification-item__body">
                    <div className="notification-item__top">
                      <h3 className="notification-item__title">{item.title}</h3>
                      {!item.read ? (
                        <span className="notification-item__dot" aria-label={p.unreadLabel} />
                      ) : null}
                    </div>
                    <p className="notification-item__message">{item.message}</p>
                    {item.timeLabel ? (
                      <time className="notification-item__time">{item.timeLabel}</time>
                    ) : null}
                  </div>
                </button>

                {!item.read ? (
                  <button
                    type="button"
                    className="notification-item__mark"
                    onClick={() => markAsRead(item.id)}
                  >
                    <CircleCheckBig size={14} />
                    {p.read}
                  </button>
                ) : (
                  <span className="notification-item__read-label">{p.read}</span>
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default NotificationsPage
