function StatusBadge({ value, status }) {
  const raw = value ?? status
  const normalized = String(raw || '').toLowerCase().trim()

  let toneClass = 'status-neutral'
  let label = raw

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
    normalized.includes('overdue')
  ) {
    toneClass = 'status-danger'
  } else if (
    normalized === 'medium' ||
    normalized.includes('pending') ||
    normalized.includes('moderate') ||
    normalized.includes('warn')
  ) {
    toneClass = 'status-warning'
  }

  if (normalized === 'high' || normalized === 'medium' || normalized === 'low') {
    label = normalized.charAt(0).toUpperCase() + normalized.slice(1)
  }

  return <span className={`status-badge ${toneClass}`}>{label || '—'}</span>
}

export default StatusBadge
