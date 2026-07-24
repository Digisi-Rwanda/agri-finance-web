import {
  AlertCircle,
  ArrowRight,
  ChevronRight,
  CreditCard,
  HandCoins,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import NeonSegmentChart from '../components/dashboard/NeonSegmentChart'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import { getCurrentUser } from '../services/auth'
import { getAnalyticsOverview } from '../services/analyticsService'
import { getAuditLogs } from '../services/auditService'
import { getFarmersWithInsights } from '../services/farmerService'
import { formatRwfCompact } from '../utils/currency'
import {
  formatAuditAction,
  formatTimestamp,
  mapCountsToBarRows,
} from '../utils/dashboard'
import { formatRwandaPhoneDisplay } from '../utils/rwandaPhone'

const LOAN_STATUS_LABELS = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  DISBURSED: 'Disbursed',
  REPAID: 'Repaid',
}

function normalizeRisk(risk) {
  const value = String(risk || '').trim().toUpperCase()
  if (value === 'HIGH' || value === 'MEDIUM' || value === 'LOW') return value
  return null
}

function formatRiskLabel(risk) {
  const value = normalizeRisk(risk)
  if (!value) return 'Unknown'
  return value.charAt(0) + value.slice(1).toLowerCase()
}

function scoreTone(score) {
  if (score == null || Number.isNaN(Number(score))) return 'muted'
  const n = Number(score)
  if (n >= 70) return 'good'
  if (n >= 40) return 'mid'
  return 'low'
}

function formatDisplayName(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function riskRank(risk) {
  const value = normalizeRisk(risk)
  if (value === 'HIGH') return 0
  if (value === 'MEDIUM') return 1
  if (value === 'LOW') return 2
  return 3
}

function BankDashboardPage() {
  const isAdmin = getCurrentUser()?.role === 'ADMIN'
  const [farmers, setFarmers] = useState([])
  const [overview, setOverview] = useState(null)
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setLoadError('')
      const [farmersData, overviewData, logsData] = await Promise.allSettled([
        getFarmersWithInsights(),
        getAnalyticsOverview(),
        isAdmin ? getAuditLogs() : Promise.resolve([]),
      ])

      if (farmersData.status === 'fulfilled') {
        setFarmers(Array.isArray(farmersData.value) ? farmersData.value : [])
      } else {
        setFarmers([])
        setLoadError('Could not load portfolio farmers.')
      }

      if (overviewData.status === 'fulfilled') setOverview(overviewData.value)

      if (isAdmin && logsData.status === 'fulfilled') {
        setActivities(
          (logsData.value || []).slice(0, 6).map((log) => ({
            id: `log-${log.logId}`,
            title: formatAuditAction(log.action),
            time: formatTimestamp(log.timestamp),
          })),
        )
      } else {
        setActivities([])
      }

      setLoading(false)
    }
    load()
  }, [isAdmin])

  const previewFarmers = useMemo(
    () =>
      [...farmers]
        .sort((a, b) => {
          const riskDiff = riskRank(a.riskLevel) - riskRank(b.riskLevel)
          if (riskDiff !== 0) return riskDiff
          return String(a.fullName || '').localeCompare(String(b.fullName || ''))
        })
        .slice(0, 8),
    [farmers],
  )

  const highRiskFarmers = useMemo(
    () => farmers.filter((farmer) => normalizeRisk(farmer.riskLevel) === 'HIGH'),
    [farmers],
  )

  const pendingLoanFarmers = useMemo(
    () =>
      farmers.filter((farmer) => String(farmer.activeLoan || '').toUpperCase() === 'PENDING'),
    [farmers],
  )

  /** Today’s work: pending applications first, then high-risk (no duplicates). */
  const workQueue = useMemo(() => {
    const pending = pendingLoanFarmers.map((farmer) => ({
      key: `pending-${farmer.farmerId}`,
      kind: 'pending',
      farmer,
      label: 'Pending application',
      detail:
        farmer.activeLoanAmount != null
          ? formatRwfCompact(farmer.activeLoanAmount)
          : 'Amount pending',
      meta: farmer.activeLoanPurpose || 'Review credit & repay capacity',
      href: `/farmer/${farmer.farmerId}`,
    }))

    const seen = new Set(pending.map((row) => row.farmer.farmerId))
    const riskRows = highRiskFarmers
      .filter((farmer) => !seen.has(farmer.farmerId))
      .map((farmer) => ({
        key: `risk-${farmer.farmerId}`,
        kind: 'risk',
        farmer,
        label: 'High risk',
        detail: `Score ${farmer.latestCreditScore ?? farmer.creditScore ?? '—'}`,
        meta: 'Open profile to review drivers',
        href: `/farmer/${farmer.farmerId}`,
      }))

    return [...pending, ...riskRows].slice(0, 5)
  }, [pendingLoanFarmers, highRiskFarmers])

  const totalFarmers = overview?.farmers ?? farmers.length
  const activeLoans =
    Number(overview?.loansByStatus?.APPROVED || 0) + Number(overview?.loansByStatus?.DISBURSED || 0)
  const pendingCount = Number(overview?.loansByStatus?.PENDING || 0)
  const highRiskCount = highRiskFarmers.length

  const primaryAlert = loadError
    ? { tone: 'warn', href: null, icon: AlertCircle, body: loadError, action: null }
    : pendingCount > 0
      ? {
          tone: 'warn',
          href: '/loans',
          icon: HandCoins,
          body: (
            <>
              <strong>
                {pendingCount} loan application{pendingCount === 1 ? '' : 's'}
              </strong>{' '}
              waiting for review
              {pendingLoanFarmers.length > 0
                ? ` · ${pendingLoanFarmers.length} in your consented portfolio`
                : ''}
            </>
          ),
          action: 'Open loans',
        }
      : highRiskCount > 0
        ? {
            tone: 'risk',
            href: '/farmer',
            icon: AlertCircle,
            body: (
              <>
                <strong>
                  {highRiskCount} high-risk farmer{highRiskCount === 1 ? '' : 's'}
                </strong>{' '}
                in your consented portfolio
              </>
            ),
            action: 'View farmers',
          }
        : null

  const loanStatusRows = mapCountsToBarRows(overview?.loansByStatus, LOAN_STATUS_LABELS)
  const riskRows = mapCountsToBarRows(overview?.creditRiskLatestByTier)

  if (loading) {
    return (
      <section className="dashboard-page dashboard-page--compact bank-dashboard-page">
        <PageHeader title="Bank dashboard" subtitle="Loading today’s portfolio…" />
        <div className="widgets three">
          {[1, 2, 3].map((id) => (
            <article key={id} className="widget card dashboard-skeleton" />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="dashboard-page dashboard-page--compact bank-dashboard-page">
      <PageHeader
        title="Bank dashboard"
        subtitle={`${totalFarmers.toLocaleString()} consented farmers · focus on what needs review today.`}
        actions={
          pendingCount > 0 ? (
            <Link to="/loans" className="btn-primary">
              Review {pendingCount} pending
              <ArrowRight size={16} />
            </Link>
          ) : (
            <Link to="/loans" className="btn-primary">
              Manage loans
              <ArrowRight size={16} />
            </Link>
          )
        }
      />

      {primaryAlert ? (
        <div className="dash-alerts">
          {(() => {
            const AlertIcon = primaryAlert.icon
            const body = (
              <>
                <AlertIcon size={18} />
                <span>{primaryAlert.body}</span>
                {primaryAlert.action ? (
                  <span className="dash-alert__action">{primaryAlert.action}</span>
                ) : null}
              </>
            )
            return primaryAlert.href ? (
              <Link
                to={primaryAlert.href}
                className={`dash-alert dash-alert--${primaryAlert.tone}`}
              >
                {body}
              </Link>
            ) : (
              <div className={`dash-alert dash-alert--${primaryAlert.tone}`}>{body}</div>
            )
          })()}
        </div>
      ) : null}

      <div className="widgets three">
        <StatCard
          title="Pending review"
          value={pendingCount.toLocaleString()}
          meta="Loan applications waiting"
          accent={pendingCount > 0 ? 'amber' : 'green'}
        />
        <StatCard
          title="Active loans"
          value={activeLoans.toLocaleString()}
          meta="Approved + disbursed"
          accent="blue"
        />
        <StatCard
          title="High risk"
          value={highRiskCount.toLocaleString()}
          meta="In consented portfolio"
          accent={highRiskCount > 0 ? 'amber' : 'slate'}
        />
      </div>

      <div className="dash-section">
        <div className="dash-section__head bank-dash-queue-head">
          <div>
            <h2>Today’s queue</h2>
            <p>Pending applications and high-risk farmers that need attention</p>
          </div>
          <Link to="/loans" className="btn-view">
            All loans
          </Link>
        </div>

        {workQueue.length === 0 ? (
          <article className="card bank-dash-queue-empty">
            <p className="muted">
              Nothing urgent right now. When farmers apply or scores move to high risk, they
              will show up here.
            </p>
            <Link to="/farmer" className="btn-secondary">
              Browse farmers
            </Link>
          </article>
        ) : (
          <ul className="bank-dash-queue">
            {workQueue.map((row) => {
              const name =
                formatDisplayName(row.farmer.fullName) || `Farmer #${row.farmer.farmerId}`
              return (
                <li key={row.key}>
                  <Link to={row.href} className={`bank-dash-queue-item bank-dash-queue-item--${row.kind}`}>
                    <div className="bank-dash-queue-item__main">
                      <strong>{name}</strong>
                      <small>
                        #{row.farmer.farmerId}
                        {row.farmer.phone
                          ? ` · ${formatRwandaPhoneDisplay(row.farmer.phone)}`
                          : ''}
                      </small>
                    </div>
                    <div className="bank-dash-queue-item__mid">
                      <span className={`bank-dash-queue-tag bank-dash-queue-tag--${row.kind}`}>
                        {row.label}
                      </span>
                      <span className="bank-dash-queue-detail">{row.detail}</span>
                      <small className="bank-dash-queue-meta">{row.meta}</small>
                    </div>
                    <span className="bank-dash-queue-item__go">
                      Open
                      <ChevronRight size={16} aria-hidden />
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className={`dashboard-grid dashboard-grid--main dashboard-grid--compact${isAdmin ? '' : ' bank-dash-portfolio-wide'}`}>
        <article className="card dash-farmers-card">
          <div className="section-head">
            <div>
              <h2>Portfolio farmers</h2>
              <p className="card-subtitle">
                {farmers.length} consented · highest risk first
              </p>
            </div>
            <Link to="/farmer" className="btn-view">
              View all
            </Link>
          </div>

          <div className="table-shell bank-dash-table-wrap">
            <div className="table-scroll">
              <table className="desktop-table dashboard-table bank-dash-table">
                <thead>
                  <tr>
                    <th>Farmer</th>
                    <th>Score</th>
                    <th>Risk</th>
                    <th>Loan</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {previewFarmers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="empty-cell">
                        No consented farmers yet. Farmers appear here after they grant bank
                        consent in the Consent Vault / mobile app.
                      </td>
                    </tr>
                  ) : (
                    previewFarmers.map((farmer) => {
                      const risk = normalizeRisk(farmer.riskLevel)
                      const score = farmer.latestCreditScore ?? farmer.creditScore
                      const loanStatus = farmer.activeLoan
                        ? String(farmer.activeLoan).charAt(0) +
                          String(farmer.activeLoan).slice(1).toLowerCase()
                        : 'None'
                      return (
                        <tr key={farmer.farmerId}>
                          <td>
                            <strong className="dash-name">
                              {formatDisplayName(farmer.fullName) || `Farmer #${farmer.farmerId}`}
                            </strong>
                            <small className="bank-dash-sub">
                              #{farmer.farmerId}
                              {farmer.phone ? ` · ${formatRwandaPhoneDisplay(farmer.phone)}` : ''}
                            </small>
                          </td>
                          <td>
                            <span className={`bank-dash-score bank-dash-score--${scoreTone(score)}`}>
                              {score ?? '—'}
                            </span>
                          </td>
                          <td>
                            <StatusBadge value={risk || formatRiskLabel(farmer.riskLevel)} />
                          </td>
                          <td>{loanStatus}</td>
                          <td className="bank-dash-row-actions">
                            <Link to={`/payments?farmerId=${farmer.farmerId}`} className="btn-view">
                              Payments
                            </Link>
                            <Link to={`/farmer/${farmer.farmerId}`} className="btn-view">
                              Profile
                              <ChevronRight size={14} aria-hidden />
                            </Link>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bank-dash-mobile">
            {previewFarmers.length === 0 ? (
              <p className="muted">
                No consented farmers yet. They appear after granting bank consent on mobile or
                Consent Vault.
              </p>
            ) : (
              previewFarmers.map((farmer) => {
                const risk = normalizeRisk(farmer.riskLevel)
                const score = farmer.latestCreditScore ?? farmer.creditScore
                return (
                  <article key={`m-${farmer.farmerId}`} className="bank-dash-mobile-card">
                    <div className="bank-dash-mobile-card__head">
                      <div>
                        <strong>
                          {formatDisplayName(farmer.fullName) || `Farmer #${farmer.farmerId}`}
                        </strong>
                        <small>
                          #{farmer.farmerId}
                          {farmer.phone ? ` · ${formatRwandaPhoneDisplay(farmer.phone)}` : ''}
                        </small>
                      </div>
                      <StatusBadge value={risk || formatRiskLabel(farmer.riskLevel)} />
                    </div>
                    <div className="bank-dash-mobile-card__meta">
                      <span>
                        Score{' '}
                        <strong className={`bank-dash-score bank-dash-score--${scoreTone(score)}`}>
                          {score ?? '—'}
                        </strong>
                      </span>
                      <span>Loan {farmer.activeLoan || 'None'}</span>
                    </div>
                    <div className="bank-dash-mobile-card__actions">
                      <Link to={`/payments?farmerId=${farmer.farmerId}`} className="btn-secondary">
                        <CreditCard size={14} aria-hidden />
                        Payments
                      </Link>
                      <Link to={`/farmer/${farmer.farmerId}`} className="btn-primary">
                        Profile
                      </Link>
                    </div>
                  </article>
                )
              })
            )}
          </div>
        </article>

        {isAdmin ? (
          <article className="card activity-card">
            <div className="section-head">
              <div>
                <h2>Recent activity</h2>
                <p className="card-subtitle">Latest system events</p>
              </div>
              <Link to="/audit" className="btn-view">
                Full log
              </Link>
            </div>
            {activities.length === 0 ? (
              <p className="muted dashboard-empty">No recent activity.</p>
            ) : (
              <ul className="activity-list">
                {activities.map((item) => (
                  <li className="activity-item" key={item.id}>
                    <strong>{item.title}</strong>
                    <small>{item.time}</small>
                  </li>
                ))}
              </ul>
            )}
          </article>
        ) : null}
      </div>

      <details className="bank-dash-insights">
        <summary>
          <span>Insights</span>
          <small>Loan pipeline &amp; credit risk tiers</small>
        </summary>
        <div className="dashboard-grid dashboard-grid--equal dashboard-grid--compact">
          <article className="card">
            <div className="section-head">
              <div>
                <h2>Loan pipeline</h2>
                <p className="card-subtitle">Applications by status</p>
              </div>
              <Link to="/loans" className="btn-view">
                Open
              </Link>
            </div>
            <NeonSegmentChart rows={loanStatusRows} emptyMessage="No loan applications yet." />
          </article>

          <article className="card">
            <div className="section-head">
              <div>
                <h2>Credit risk</h2>
                <p className="card-subtitle">Latest farmer risk tiers</p>
              </div>
              <Link to="/farmer" className="btn-view">
                Open
              </Link>
            </div>
            <NeonSegmentChart rows={riskRows} emptyMessage="No risk scores yet." />
          </article>
        </div>
      </details>
    </section>
  )
}

export default BankDashboardPage
