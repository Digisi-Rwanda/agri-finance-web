function StatusBadge({ value }) {
  const normalized = String(value || '').toLowerCase()

  const toneClass =
    normalized.includes('approve') || normalized.includes('success') || normalized.includes('active')
      ? 'status-success'
      : normalized.includes('reject') || normalized.includes('alert')
        ? 'status-danger'
        : normalized.includes('pending') || normalized.includes('moderate')
          ? 'status-warning'
          : 'status-neutral'

  return <span className={`status-badge ${toneClass}`}>{value}</span>
}

export default StatusBadge
