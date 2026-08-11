/** Resolve dotted path on portal copy tree; supports function leaves with args. */
export function portalGet(copy, path, ...args) {
  if (!copy || !path) return path
  const value = String(path)
    .split('.')
    .reduce((acc, key) => (acc != null ? acc[key] : undefined), copy)
  if (typeof value === 'function') return value(...args)
  return value
}

export function translateStatusLabel(portal, raw) {
  if (raw == null || raw === '') return '—'
  const key = String(raw).trim()
  const upper = key.toUpperCase()
  const statuses = portal?.shared?.statuses || {}
  if (statuses[upper]) return statuses[upper]
  if (statuses[key]) return statuses[key]
  const lower = key.toLowerCase()
  if (statuses[lower]) return statuses[lower]
  if (['high', 'medium', 'low'].includes(lower)) {
    return portal?.shared?.risk?.[lower] || key.charAt(0).toUpperCase() + key.slice(1).toLowerCase()
  }
  return key
}
