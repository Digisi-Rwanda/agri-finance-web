/**
 * Small helpers for dashboard pages.
 * Keeps display logic out of JSX so pages stay easy to read.
 */

/** Turn API maps like { APPROVED: 3, PENDING: 1 } into sorted bar-chart rows. */
export function mapCountsToBarRows(countMap = {}, labelMap = {}) {
  return Object.entries(countMap)
    .map(([key, value]) => ({
      label: labelMap[key] || key.replace(/_/g, ' '),
      value: Number(value) || 0,
    }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value)
}

/** Approval rate from approved + rejected counts. Returns "—" when not enough data. */
export function calcApprovalRate(approved = 0, rejected = 0) {
  const decided = Number(approved) + Number(rejected)
  if (decided <= 0) return '—'
  return `${((Number(approved) / decided) * 100).toFixed(1)}%`
}

/** Make audit log lines easier to read in the activity feed. */
export function formatAuditAction(action = '') {
  const text = String(action)
  if (text.startsWith('AUTH_LOGIN')) return 'User signed in'
  if (text.startsWith('AUTH_LOGOUT')) return 'User signed out'
  if (text.startsWith('AUTH_REGISTER')) return 'New account registered'
  if (text.startsWith('AUTH_PASSWORD')) return 'Password updated'
  if (text.includes('LOAN')) return 'Loan activity recorded'
  return text.length > 48 ? `${text.slice(0, 48)}…` : text
}

/** Format ISO timestamps for tables and feeds. */
export function formatTimestamp(value) {
  if (!value) return 'Recently'
  return String(value).replace('T', ' ').slice(0, 16)
}

/** Gauge ring fill percentage (0–100). */
export function calcGaugePct(value, max) {
  if (!max || max <= 0) return 0
  return Math.min(100, Math.round((Number(value) / Number(max)) * 100))
}

/** Build a small trend series for the area chart from overview numbers. */
/** Gauge ring colors — neon on dark, Agri Trust greens/blues on light. */
export function getGaugeColors(isDark) {
  return isDark
    ? ['#22d3ee', '#f472b6', '#a3e635', '#facc15']
    : ['#00450d', '#2b5bb5', '#0a5c18', '#6fbf73']
}

export function buildOverviewTrend(overview, farmersCount = 0) {
  const farmers = Number(overview?.farmers ?? farmersCount ?? 0)
  const loans = Number(overview?.loansTotal ?? 0)
  const approved = Number(overview?.loansByStatus?.APPROVED ?? 0)
  const farms = Number(overview?.farms ?? 0)

  return [
    { name: 'Farmers', value: farmers },
    { name: 'Farms', value: farms },
    { name: 'Loans', value: loans },
    { name: 'Approved', value: approved },
  ]
}
