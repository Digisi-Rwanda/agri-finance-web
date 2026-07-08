import { FileCheck2, HandCoins, Wallet } from 'lucide-react'
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
          logsData.value.slice(0, 4).map((log) => ({
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

  const previewFarmers = useMemo(() => farmers.slice(0, 5), [farmers])

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
    <section className="dashboard-page dashboard-page--compact">
      <PageHeader
        subtitle="Portfolio overview at a glance."
        actions={
          <>
            <Link to="/farmer" className="btn-secondary">
              Farmers
            </Link>
            <Link to="/loans" className="btn-primary">
              Loans
            </Link>
          </>
        }
      />

      <div className="widgets four">
        <StatCard title="Farmers" value={totalFarmers.toLocaleString()} meta="With bank consent" />
        <StatCard title="Applications" value={totalLoans.toLocaleString()} meta={`${pendingCount} pending`} />
        <StatCard title="Active loans" value={activeLoans.toLocaleString()} meta="Approved" />
        <StatCard title="Approval rate" value={approvalRate} meta="Approved vs rejected" />
      </div>

      <div className="dashboard-grid dashboard-grid--compact">
        <article className="card">
          <div className="section-head">
            <div>
              <h2>Loan pipeline</h2>
              <p className="card-subtitle">Status breakdown</p>
            </div>
          </div>
          <NeonSegmentChart rows={loanStatusRows} emptyMessage="No loan applications yet." />
        </article>

        <article className="card">
          <div className="section-head">
            <div>
              <h2>Credit risk</h2>
              <p className="card-subtitle">Latest farmer tiers</p>
            </div>
          </div>
          <NeonSegmentChart rows={riskRows} emptyMessage="No risk scores yet." />
        </article>
      </div>

      <div className="dashboard-grid dashboard-grid--compact dashboard-grid--split">
        <article className="card dash-farmers-card">
          <div className="section-head">
            <div>
              <h2>Recent farmers</h2>
              <p className="card-subtitle">{farmers.length} registered</p>
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
                        <td>{farmer.fullName}</td>
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
                Audit
              </Link>
            ) : null}
          </div>
          {activities.length === 0 ? (
            <p className="muted">No recent activity.</p>
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

          <div className="dash-shortcuts">
            <Link to="/farmer" className="dash-shortcut">
              <FileCheck2 size={16} />
              Farmers
            </Link>
            <Link to="/loans" className="dash-shortcut">
              <HandCoins size={16} />
              Loans
            </Link>
            <Link to="/payments" className="dash-shortcut">
              <Wallet size={16} />
              Payments
            </Link>
          </div>
        </article>
      </div>
    </section>
  )
}

export default BankDashboardPage
