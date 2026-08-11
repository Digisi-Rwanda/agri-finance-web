import {
  AlertCircle,
  ArrowRight,
  ChevronRight,
  CreditCard,
  HandCoins,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import SimpleBarChart from '../components/dashboard/SimpleBarChart'
import StatCard from '../components/ui/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import { usePageCopy } from '../context/AuthLocaleContext'
import { translateStatusLabel } from '../i18n/portalUtils'
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

function normalizeRisk(risk) {
  const value = String(risk || '').trim().toUpperCase()
  if (value === 'HIGH' || value === 'MEDIUM' || value === 'LOW') return value
  return null
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

function loanStatusLabel(portal, status) {
  if (!status) return portal.pages?.bankDashboard?.none ?? portal.shared?.none ?? 'None'
  return translateStatusLabel(portal, status)
}

function BankDashboardPage() {
  const { s, p } = usePageCopy('bankDashboard')
  const portal = useMemo(() => ({ shared: s, pages: { bankDashboard: p } }), [s, p])
  const isAdmin = getCurrentUser()?.role === 'ADMIN'
  const [farmers, setFarmers] = useState([])
  const [overview, setOverview] = useState(null)
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const loanStatusLabels = useMemo(
    () => ({
      PENDING: s.statuses.PENDING,
      APPROVED: s.statuses.APPROVED,
      REJECTED: s.statuses.REJECTED,
      DISBURSED: s.statuses.DISBURSED,
      REPAID: 'Repaid',
    }),
    [s],
  )

  const riskLabels = useMemo(
    () => ({
      HIGH: s.risk.high,
      MEDIUM: s.risk.medium,
      LOW: s.risk.low,
    }),
    [s],
  )

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
        setLoadError(p.loadFailed)
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
  }, [isAdmin, p.loadFailed])

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
      label: p.pendingApplication,
      detail:
        farmer.activeLoanAmount != null
          ? formatRwfCompact(farmer.activeLoanAmount)
          : p.amountPending,
      meta: farmer.activeLoanPurpose || p.reviewCredit,
      href: `/farmer/${farmer.farmerId}`,
    }))

    const seen = new Set(pending.map((row) => row.farmer.farmerId))
    const riskRows = highRiskFarmers
      .filter((farmer) => !seen.has(farmer.farmerId))
      .map((farmer) => ({
        key: `risk-${farmer.farmerId}`,
        kind: 'risk',
        farmer,
        label: p.highRiskLabel,
        detail: `Score ${farmer.latestCreditScore ?? farmer.creditScore ?? '—'}`,
        meta: p.openProfileReview,
        href: `/farmer/${farmer.farmerId}`,
      }))

    return [...pending, ...riskRows].slice(0, 5)
  }, [pendingLoanFarmers, highRiskFarmers, p])

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
          body: p.pendingAlert(pendingCount, pendingLoanFarmers.length),
          action: p.openLoans,
        }
      : highRiskCount > 0
        ? {
            tone: 'risk',
            href: '/farmer',
            icon: AlertCircle,
            body: p.highRiskAlert(highRiskCount),
            action: p.viewFarmers,
          }
        : null

  const loanStatusRows = mapCountsToBarRows(overview?.loansByStatus, loanStatusLabels)
  const riskRows = mapCountsToBarRows(overview?.creditRiskLatestByTier, riskLabels)

  if (loading) {
    return (
      <section className="dashboard-page dashboard-page--compact bank-dashboard-page">
        <PageHeader subtitle={p.loadingSubtitle} />
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
        subtitle={p.subtitle(totalFarmers.toLocaleString())}
        actions={
          pendingCount > 0 ? (
            <Link to="/loans" className="btn-primary">
              {p.reviewPending(pendingCount)}
              <ArrowRight size={16} />
            </Link>
          ) : (
            <Link to="/loans" className="btn-primary">
              {p.manageLoans}
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
          title={p.pendingReview}
          value={pendingCount.toLocaleString()}
          meta={p.pendingReviewMeta}
          accent={pendingCount > 0 ? 'amber' : 'green'}
        />
        <StatCard
          title={p.activeLoans}
          value={activeLoans.toLocaleString()}
          meta={p.activeLoansMeta}
          accent="blue"
        />
        <StatCard
          title={p.highRisk}
          value={highRiskCount.toLocaleString()}
          meta={p.highRiskMeta}
          accent={highRiskCount > 0 ? 'amber' : 'slate'}
        />
      </div>

      <div className="dash-section">
        <div className="dash-section__head bank-dash-queue-head">
          <div>
            <h2>{p.todaysQueue}</h2>
            <p>{p.queueSubtitle}</p>
          </div>
          <Link to="/loans" className="btn-view">
            {p.allLoans}
          </Link>
        </div>

        {workQueue.length === 0 ? (
          <article className="card bank-dash-queue-empty">
            <p className="muted">{p.queueEmpty}</p>
            <Link to="/farmer" className="btn-secondary">
              {p.browseFarmers}
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
                      {p.open}
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
              <h2>{p.portfolioFarmers}</h2>
              <p className="card-subtitle">{p.portfolioSubtitle(farmers.length)}</p>
            </div>
            <Link to="/farmer" className="btn-view">
              {p.viewAll}
            </Link>
          </div>

          <div className="table-shell bank-dash-table-wrap">
            <div className="table-scroll">
              <table className="desktop-table dashboard-table bank-dash-table">
                <thead>
                  <tr>
                    <th>{p.colFarmer}</th>
                    <th>{p.colScore}</th>
                    <th>{p.colRisk}</th>
                    <th>{p.colLoan}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {previewFarmers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="empty-cell">
                        {p.portfolioEmpty}
                      </td>
                    </tr>
                  ) : (
                    previewFarmers.map((farmer) => {
                      const risk = normalizeRisk(farmer.riskLevel)
                      const score = farmer.latestCreditScore ?? farmer.creditScore
                      const loanStatus = loanStatusLabel(portal, farmer.activeLoan)
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
                            <StatusBadge value={risk || farmer.riskLevel || p.unknown} />
                          </td>
                          <td>{loanStatus}</td>
                          <td className="bank-dash-row-actions">
                            <Link to={`/payments?farmerId=${farmer.farmerId}`} className="btn-view">
                              {p.payments}
                            </Link>
                            <Link to={`/farmer/${farmer.farmerId}`} className="btn-view">
                              {p.profile}
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
              <p className="muted">{p.portfolioEmpty}</p>
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
                      <StatusBadge value={risk || farmer.riskLevel || p.unknown} />
                    </div>
                    <div className="bank-dash-mobile-card__meta">
                      <span>
                        {p.colScore}{' '}
                        <strong className={`bank-dash-score bank-dash-score--${scoreTone(score)}`}>
                          {score ?? '—'}
                        </strong>
                      </span>
                      <span>
                        {p.colLoan} {loanStatusLabel(portal, farmer.activeLoan)}
                      </span>
                    </div>
                    <div className="bank-dash-mobile-card__actions">
                      <Link to={`/payments?farmerId=${farmer.farmerId}`} className="btn-secondary">
                        <CreditCard size={14} aria-hidden />
                        {p.payments}
                      </Link>
                      <Link to={`/farmer/${farmer.farmerId}`} className="btn-primary">
                        {p.profile}
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
                <h2>{p.recentActivity}</h2>
                <p className="card-subtitle">{p.recentActivityMeta}</p>
              </div>
              <Link to="/audit" className="btn-view">
                {p.fullLog}
              </Link>
            </div>
            {activities.length === 0 ? (
              <p className="muted dashboard-empty">{p.noActivity}</p>
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

      <div className="dash-section bank-dash-overview">
        <div className="dash-section__head">
          <div>
            <h2>{p.portfolioOverview}</h2>
            <p>{p.overviewSubtitle}</p>
          </div>
          <div className="bank-dash-overview__actions">
            <Link to="/loans" className="btn-view">
              {p.loans}
            </Link>
            <Link to="/farmer" className="btn-view">
              {p.farmers}
            </Link>
          </div>
        </div>
        <div className="dashboard-grid dashboard-grid--equal dashboard-grid--compact">
          <article className="card">
            <div className="section-head">
              <div>
                <h2>{p.loanPipeline}</h2>
                <p className="card-subtitle">{p.pipelineMeta}</p>
              </div>
            </div>
            <SimpleBarChart rows={loanStatusRows} emptyMessage={p.noLoans} />
          </article>

          <article className="card">
            <div className="section-head">
              <div>
                <h2>{p.creditRisk}</h2>
                <p className="card-subtitle">{p.creditRiskMeta}</p>
              </div>
            </div>
            <SimpleBarChart rows={riskRows} emptyMessage={p.noRisk} />
          </article>
        </div>
      </div>
    </section>
  )
}

export default BankDashboardPage
