import { FileCheck2, HandCoins, ScrollText } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import GaugeStat from '../components/dashboard/GaugeStat'
import NeonAreaChart from '../components/dashboard/NeonAreaChart'
import NeonSegmentChart from '../components/dashboard/NeonSegmentChart'
import QuickActionCard from '../components/dashboard/QuickActionCard'
import PageHeader from '../components/ui/PageHeader'
import StatusBadge from '../components/ui/StatusBadge'
import { getCurrentUser } from '../services/auth'
import { usePortalTheme } from '../context/PortalThemeContext'
import { getAnalyticsOverview } from '../services/analyticsService'
import { getAuditLogs } from '../services/auditService'
import { getFarmersWithInsights } from '../services/farmerService'
import {
  buildOverviewTrend,
  calcApprovalRate,
  calcGaugePct,
  formatAuditAction,
  formatTimestamp,
  getGaugeColors,
  mapCountsToBarRows,
} from '../utils/dashboard'

const LOAN_STATUS_LABELS = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  DISBURSED: 'Disbursed',
  REPAID: 'Repaid',
}

function BankDashboardPage() {
  const { isDark } = usePortalTheme()
  const isAdmin = getCurrentUser()?.role === 'ADMIN'
  const gaugeColors = getGaugeColors(isDark)
  const [farmers, setFarmers] = useState([])
  const [overview, setOverview] = useState(null)
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [scoreFilter, setScoreFilter] = useState('')
  const [riskFilter, setRiskFilter] = useState('All')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [farmersData, overviewData, logsData] = await Promise.allSettled([
        getFarmersWithInsights(),
        getAnalyticsOverview(),
        getAuditLogs(),
      ])

      if (farmersData.status === 'fulfilled') setFarmers(farmersData.value)
      if (overviewData.status === 'fulfilled') setOverview(overviewData.value)

      if (logsData.status === 'fulfilled') {
        setActivities(
          logsData.value.slice(0, 5).map((log) => ({
            id: `log-${log.logId}`,
            title: formatAuditAction(log.action),
            detail: log.action,
            time: formatTimestamp(log.timestamp),
          })),
        )
      }

      setLoading(false)
    }
    load()
  }, [])

  const filteredFarmers = useMemo(() => {
    return farmers.filter((farmer) => {
      const score = Number(farmer.latestCreditScore ?? farmer.creditScore)
      const risk = farmer.riskLevel || 'Unknown'
      const scoreOk = scoreFilter ? (farmer.latestCreditScore != null && score >= Number(scoreFilter)) : true
      const riskOk = riskFilter === 'All' ? true : risk === riskFilter
      return scoreOk && riskOk
    })
  }, [farmers, scoreFilter, riskFilter])

  const previewFarmers = filteredFarmers.slice(0, 15)

  const totalFarmers = overview?.farmers ?? farmers.length
  const activeLoans = Number(overview?.loansByStatus?.APPROVED || 0)
  const totalLoans = Number(overview?.loansTotal || 0)
  const approvedCount = Number(overview?.loansByStatus?.APPROVED || 0)
  const rejectedCount = Number(overview?.loansByStatus?.REJECTED || 0)
  const approvalRate = calcApprovalRate(approvedCount, rejectedCount)
  const approvalNumber = approvalRate === '—' ? '—' : approvalRate.replace('%', '')

  const loanStatusRows = mapCountsToBarRows(overview?.loansByStatus, LOAN_STATUS_LABELS)
  const riskRows = mapCountsToBarRows(overview?.creditRiskLatestByTier)
  const trendData = buildOverviewTrend(overview, farmers.length)
  const gaugeMax = Math.max(totalFarmers, activeLoans, totalLoans, 1)

  const progressRows = [
    { label: 'Farmers onboarded', value: calcGaugePct(totalFarmers, gaugeMax) },
    { label: 'Loans processed', value: calcGaugePct(totalLoans, gaugeMax) },
    { label: 'Active lending', value: calcGaugePct(activeLoans, gaugeMax) },
  ]

  if (loading) {
    return (
      <section className="dashboard-page">
        <PageHeader title="Dashboard" subtitle="Loading your overview…" />
        <div className="widgets four">
          {[1, 2, 3, 4].map((id) => (
            <article key={id} className="widget card dashboard-skeleton" />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="dashboard-page">
      <PageHeader
        subtitle="Live lending and farmer intelligence overview."
        actions={
          <>
            {isAdmin ? (
              <Link to="/audit" className="btn-secondary">
                Audit log
              </Link>
            ) : null}
            <Link to="/loans" className="btn-primary">
              Manage loans
            </Link>
          </>
        }
      />

      {/* Top row — circular gauges + approval tile + gradient bars */}
      <div className="widgets neon-top-row">
        <GaugeStat
          title="Farmers"
          value={totalFarmers.toLocaleString()}
          pct={calcGaugePct(totalFarmers, gaugeMax)}
          color={gaugeColors[0]}
        />
        <GaugeStat
          title="Active loans"
          value={activeLoans.toLocaleString()}
          pct={calcGaugePct(activeLoans, gaugeMax)}
          color={gaugeColors[1]}
        />
        <GaugeStat
          title="Applications"
          value={totalLoans.toLocaleString()}
          pct={calcGaugePct(totalLoans, gaugeMax)}
          color={gaugeColors[2]}
        />
        <article className="widget card neon-percent-card">
          <small>Approval rate</small>
          <strong>{approvalNumber}{approvalNumber !== '—' ? '%' : ''}</strong>
          <small>Approved vs rejected</small>
        </article>
        <article className="widget card">
          <h2 className="neon-mini-title">Pipeline health</h2>
          <div className="neon-progress-list">
            {progressRows.map((row, index) => (
              <div className="neon-progress-row" key={row.label}>
                <label>
                  <span>{row.label}</span>
                  <span>{row.value}%</span>
                </label>
                <div className="neon-progress-row__track">
                  <div
                    className={`neon-progress-row__fill neon-progress-row__fill--${['a', 'b', 'c'][index]}`}
                    style={{ width: `${row.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>

      {/* Middle row — area chart + segmented bars */}
      <div className="dashboard-grid">
        <article className="card">
          <div className="section-head">
            <div>
              <h2>Portfolio snapshot</h2>
              <p className="card-subtitle">Current totals across farmers, farms, loans, and approvals</p>
            </div>
          </div>
          <NeonAreaChart data={trendData} />
        </article>

        <article className="card">
          <h2>Credit risk mix</h2>
          <p className="card-subtitle">Latest tier per farmer</p>
          <NeonSegmentChart rows={riskRows} emptyMessage="No risk scores yet." />
        </article>
      </div>

      <div className="dashboard-grid dashboard-grid--split">
        <article className="card activity-card">
          <h2>Activities</h2>
          {activities.length === 0 ? (
            <p className="muted">No recent audit activity.</p>
          ) : (
            activities.map((item) => (
              <div className="activity-item" key={item.id}>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
                <small>{item.time}</small>
              </div>
            ))
          )}
          {isAdmin ? (
            <Link to="/audit" className="card-link">
              View all activity
            </Link>
          ) : null}
        </article>

        <article className="card">
          <div className="section-head">
            <div>
              <h2>Loan status</h2>
              <p className="card-subtitle">Current pipeline breakdown</p>
            </div>
          </div>
          <NeonSegmentChart rows={loanStatusRows} emptyMessage="No loan applications yet." />
        </article>
      </div>

      <article className="card">
        <div className="section-head">
          <div>
            <h2>Farmers snapshot</h2>
            <p className="card-subtitle">
              Showing {previewFarmers.length} of {filteredFarmers.length} farmers
            </p>
          </div>
          <Link to="/farmer" className="btn-secondary">
            Open analysis
          </Link>
        </div>

        <div className="filters">
          <label>
            Min. credit score
            <input
              type="number"
              value={scoreFilter}
              onChange={(event) => setScoreFilter(event.target.value)}
              placeholder="e.g. 650"
            />
          </label>
          <label>
            Risk level
            <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)}>
              <option>All</option>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </label>
        </div>

        <div className="table-shell">
          <div className="table-scroll">
            <table className="desktop-table dashboard-table">
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
                      No farmers match these filters.
                    </td>
                  </tr>
                ) : (
                  previewFarmers.map((farmer) => (
                    <tr key={farmer.farmerId}>
                      <td>{farmer.fullName}</td>
                      <td>{farmer.latestCreditScore ?? '—'}</td>
                      <td>
                        <StatusBadge value={farmer.riskLevel || 'Unknown'} />
                      </td>
                      <td>
                        {farmer.activeLoan
                          ? farmer.activeLoan.charAt(0) + farmer.activeLoan.slice(1).toLowerCase()
                          : 'None'}
                      </td>
                      <td>
                        <Link to={`/farmer/${farmer.farmerId}`} className="btn-view">
                          View profile
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </article>

      <div className="quick-actions">
        <QuickActionCard
          to="/loans"
          icon={HandCoins}
          title="Loan management"
          description="Review, approve, or reject applications"
        />
        <QuickActionCard
          to="/farmer"
          icon={FileCheck2}
          title="Farmer analysis"
          description="Browse profiles, farms, yields, and payments"
        />
        {isAdmin ? (
          <QuickActionCard
            to="/audit"
            icon={ScrollText}
            title="Audit logs"
            description="Track sign-ins and system events"
          />
        ) : (
          <QuickActionCard
            to="/payments"
            icon={ScrollText}
            title="MoMo payments"
            description="View mobile money transactions"
          />
        )}
      </div>
    </section>
  )
}

export default BankDashboardPage
