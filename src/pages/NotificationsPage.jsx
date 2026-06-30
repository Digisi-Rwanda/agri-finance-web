import { Bell, CircleCheckBig } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import PageHeader from '../components/ui/PageHeader'
import { getNotifications } from '../services/notificationService'

function NotificationsPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const data = await getNotifications()
        setItems(data.map((item) => ({ ...item, read: false })))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const markAsRead = (id) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)))
  }

  const markAllRead = () => {
    setItems((current) => current.map((item) => ({ ...item, read: true })))
    toast.success('All notifications marked as read.')
  }

  const unreadCount = items.filter((item) => !item.read).length

  return (
    <section className="dashboard-page notifications-page">
      <PageHeader
        subtitle="Loan approvals, payment reminders, and system updates."
        actions={
          <div className="notifications-page__actions">
            <span className="notifications-badge">
              <Bell size={15} />
              {unreadCount} unread
            </span>
            {unreadCount > 0 ? (
              <button type="button" className="btn-secondary" onClick={markAllRead}>
                Mark all read
              </button>
            ) : null}
          </div>
        }
      />

      {loading ? (
        <div className="notification-list">
          {[1, 2, 3].map((id) => (
            <article key={id} className="notification-item notification-item--skeleton" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <article className="card notifications-empty">
          <Bell size={28} strokeWidth={1.5} />
          <h2>No notifications yet</h2>
          <p>Loan decisions and system alerts will show up here.</p>
        </article>
      ) : (
        <div className="notification-list">
          {items.map((item) => (
            <article
              key={item.id}
              className={`notification-item ${item.read ? 'notification-item--read' : 'notification-item--unread'}`}
            >
              <div className="notification-item__body">
                <h3 className="notification-item__title">{item.title}</h3>
                <p className="notification-item__message">{item.message}</p>
              </div>

              {!item.read ? (
                <button
                  type="button"
                  className="notification-item__mark"
                  onClick={() => markAsRead(item.id)}
                >
                  <CircleCheckBig size={14} />
                  Mark read
                </button>
              ) : (
                <span className="notification-item__read-label">Read</span>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default NotificationsPage
