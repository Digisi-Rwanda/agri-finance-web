import {
  AlertCircle,
  ArrowRight,
  CreditCard,
  FileCheck2,
  HandCoins,
  Users,
  Wallet,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import NeonSegmentChart from '../components/dashboard/NeonSegmentChart'
import QuickActionCard from '../components/dashboard/QuickActionCard'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import { getCurrentUser } from '../services/auth'
import { getAnalyticsOverview } from '../services/analyticsService'
import { getAuditLogs } from '../services/auditService'
import { getFarmersWithInsights } from '../services/farmerService'
import {
  calcApprovalRate,
  formatAuditAction,
  formatTimestamp,
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
  const isAdmin = getCurrentUser()?.role === 'ADMIN'
  const [farmers, setFarmers] = useState([])
  const [overview, setOverview] = useState(null)
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

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
          logsData.value.slice(0, 6).map((log) => ({
            id: `log-${log.logId}`,
            title: formatAuditAction(log.action),
            time: formatTimestamp(log.timestamp),
          })),
        )
      }

      setLoading(false)
    }
    load()
  }, [])

  const previewFarmers = useMemo(() => farmers.slice(0, 6), [farmers])
  const highRiskFarmers = useMemo(
    () =>
      farmers.filter((f) => (f.riskLevel || '').toLowerCase() === 'high').slice(0, 3),
    [farmers],
  )

  const totalFarmers = overview?.farmers ?? farmers.length
  const activeLoans = Number(overview?.loansByStatus?.APPROVED || 0)
  const totalLoans = Number(overview?.loansTotal || 0)
  const approvedCount = Number(overview?.loansByStatus?.APPROVED || 0)
  const rejectedCount = Number(overview?.loansByStatus?.REJECTED || 0)
  const pendingCount = Number(overview?.loansByStatus?.PENDING || 0)
  const approvalRate = calcApprovalRate(approvedCount, rejectedCount)

  const loanStatusRows = mapCountsToBarRows(overview?.loansByStatus, LOAN_STATUS_LABELS)
  const riskRows = mapCountsToBarRows(overview?.creditRiskLatestByTier)

  if (loading) {
    return (
      <section className="dashboard-page dashboard-page--compact">
        <PageHeader title="Bank dashboard" subtitle="Loading your overview…" />
        <div className="widgets four">
          {[1, 2, 3, 4].map((id) => (
            <article key={id} className="widget card dashboard-skeleton" />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="dashboard-page dashboard-page--compact">
      <PageHeader
        title="Bank dashboard"
        subtitle="Portfolio overview — farmers, loans, and risk at a glance."
        actions={
          <>
            {pendingCount > 0 ? (
              <Link to="/loans" className="btn-primary">
                Review {pendingCount} pending
                <ArrowRight size={16} />
              </Link>
            ) : (
              <Link to="/loans" className="btn-primary">
                Manage loans
                <ArrowRight size={16} />
              </Link>
            )}
            <Link to="/farmer" className="btn-secondary">
              Browse farmers
            </Link>
          </>
        }
      />

      {pendingCount > 0 || highRiskFarmers.length > 0 ? (
        <div className="dash-alerts">
          {pendingCount > 0 ? (
            <Link to="/loans" className="dash-alert dash-alert--warn">
              <AlertCircle size={18} />
              <span>
                <strong>{pendingCount} loan application{pendingCount === 1 ? '' : 's'}</strong> waiting
                for review
              </span>
              <span className="dash-alert__action">Open loans</span>
            </Link>
          ) : null}
          {highRiskFarmers.length > 0 ? (
            <Link to="/farmer" className="dash-alert dash-alert--risk">
              <AlertCircle size={18} />
              <span>
                <strong>{highRiskFarmers.length} high-risk farmer{highRiskFarmers.length === 1 ? '' : 's'}</strong>{' '}
                in your consented portfolio
              </span>
              <span className="dash-alert__action">View farmers</span>
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="widgets four">
        <StatCard
          title="Farmers"
          value={totalFarmers.toLocaleString()}
          meta="With bank consent"
          accent="green"
        />
        <StatCard
          title="Applications"
          value={totalLoans.toLocaleString()}
          meta={`${pendingCount} pending review`}
          accent={pendingCount > 0 ? 'amber' : 'green'}
        />
        <StatCard
          title="Active loans"
          value={activeLoans.toLocaleString()}
          meta="Approved status"
          accent="blue"
        />
        <StatCard
          title="Approval rate"
          value={approvalRate}
          meta="Approved vs rejected"
          accent="slate"
        />
      </div>

      <div className="dash-section">
        <div className="dash-section__head">
          <h2>Quick actions</h2>
          <p>Jump to everyday bank workflows</p>
        </div>
        <div className="dash-quick-grid">
          <QuickActionCard
            to="/farmer"
            title="Farmers"
            description="Search profiles & credit scores"
            icon={Users}
          />
          <QuickActionCard
            to="/loans"
            title="Loans"
            description="Approve, reject, or track"
            icon={HandCoins}
          />
          <QuickActionCard
            to="/payments"
            title="Payments"
            description="MoMo & repayment history"
            icon={Wallet}
          />
          {isAdmin ? (
            <QuickActionCard
              to="/audit"
              title="Audit logs"
              description="System activity trail"
              icon={FileCheck2}
            />
          ) : (
            <QuickActionCard
              to="/payments"
              title="Collections"
              description="Track incoming payments"
              icon={CreditCard}
            />
          )}
        </div>
      </div>

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

      <div className="dashboard-grid dashboard-grid--main dashboard-grid--compact">
        <article className="card dash-farmers-card">
          <div className="section-head">
            <div>
              <h2>Recent farmers</h2>
              <p className="card-subtitle">{farmers.length} in portfolio</p>
            </div>
            <Link to="/farmer" className="btn-view">
              View all
            </Link>
          </div>
          <div className="table-shell">
            <div className="table-scroll">
              <table className="desktop-table dashboard-table">
                <thead>
                  <tr>
                    <th>Farmer</th>
                    <th>Score</th>
                    <th>Risk</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {previewFarmers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="empty-cell">
                        No farmers available yet.
                      </td>
                    </tr>
                  ) : (
                    previewFarmers.map((farmer) => (
                      <tr key={farmer.farmerId}>
                        <td>
                          <strong className="dash-name">{farmer.fullName}</strong>
                        </td>
                        <td>{farmer.latestCreditScore ?? '—'}</td>
                        <td>
                          <StatusBadge value={farmer.riskLevel || 'Unknown'} />
                        </td>
                        <td>
                          <Link to={`/farmer/${farmer.farmerId}`} className="btn-view">
                            Open
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

        <article className="card activity-card">
          <div className="section-head">
            <div>
              <h2>Recent activity</h2>
              <p className="card-subtitle">Latest system events</p>
            </div>
            {isAdmin ? (
              <Link to="/audit" className="btn-view">
                Full log
              </Link>
            ) : null}
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
      </div>
    </section>
  )
}

export default BankDashboardPage
