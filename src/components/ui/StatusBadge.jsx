import { translateStatusLabel } from '../../i18n/portalUtils'
import { usePortalCopy } from '../../context/AuthLocaleContext'

function StatusBadge({ value, status }) {
  const portal = usePortalCopy()
  const raw = value ?? status
  const normalized = String(raw || '').toLowerCase().trim()

  let toneClass = 'status-neutral'

  if (
    normalized === 'low' ||
    normalized === 'verified' ||
    normalized.includes('approve') ||
    normalized.includes('success') ||
    normalized.includes('active') ||
    normalized.includes('disburs') ||
    normalized.includes('repaid')
  ) {
    toneClass = 'status-success'
  } else if (
    normalized === 'high' ||
    normalized === 'disputed' ||
    normalized.includes('reject') ||
    normalized.includes('alert') ||
    normalized.includes('danger') ||
    normalized.includes('overdue') ||
    normalized.includes('unmatched')
  ) {
    toneClass = 'status-danger'
  } else if (
    normalized === 'medium' ||
    normalized.includes('pending') ||
    normalized.includes('moderate') ||
    normalized.includes('warn') ||
    normalized.includes('partial') ||
    normalized.includes('watching')
  ) {
    toneClass = 'status-warning'
  } else if (normalized.includes('matched') || normalized.includes('verified')) {
    toneClass = 'status-success'
  }

  const label = translateStatusLabel(portal, raw)

  return <span className={`status-badge ${toneClass}`}>{label || '—'}</span>
}

export default StatusBadge
