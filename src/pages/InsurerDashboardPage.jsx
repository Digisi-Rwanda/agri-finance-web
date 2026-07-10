import { AlertCircle, ArrowRight, CreditCard, ShieldCheck, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import NeonSegmentChart from '../components/dashboard/NeonSegmentChart'
import QuickActionCard from '../components/dashboard/QuickActionCard'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import { getAnalyticsOverview } from '../services/analyticsService'
import { getFarmers, enrichFarmersWithInsights } from '../services/farmerService'
import { mapCountsToBarRows } from '../utils/dashboard'

function suggestPolicy(riskLevel = '') {
  const risk = riskLevel.toLowerCase()
  if (risk === 'high') return 'Flood protection'
  if (risk === 'medium') return 'Crop protection'
  return 'Basic crop cover'
}

function InsurerDashboardPage() {
  const [farmers, setFarmers] = useState([])
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [farmersData, overviewData] = await Promise.allSettled([getFarmers(), getAnalyticsOverview()])
      if (farmersData.status === 'fulfilled') {
        setFarmers(await enrichFarmersWithInsights(farmersData.value, { includeLoans: false }))
      }
      if (overviewData.status === 'fulfilled') setOverview(overviewData.value)
      setLoading(false)
    }
    load()
  }, [])

  const highRiskCount = useMemo(
    () => farmers.filter((farmer) => (farmer.riskLevel || '').toLowerCase() === 'high').length,
    [farmers],
  )

  const mediumRiskCount = useMemo(
    () => farmers.filter((farmer) => (farmer.riskLevel || '').toLowerCase() === 'medium').length,
    [farmers],
  )

  const policyCount = Number(overview?.insurancePolicies || 0)
  const riskRows = mapCountsToBarRows(overview?.creditRiskLatestByTier)
  const previewFarmers = useMemo(
    () =>
      [...farmers].sort((a, b) => {
        const rank = (r) => {
          const v = (r || '').toLowerCase()
          if (v === 'high') return 0
          if (v === 'medium') return 1
          return 2
        }
        return rank(a.riskLevel) - rank(b.riskLevel)
      }).slice(0, 8),
    [farmers],
  )

  if (loading) {
    return (
      <section className="dashboard-page dashboard-page--compact">
        <PageHeader title="Insurer dashboard" subtitle="Loading…" />
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
        title="Insurer dashboard"
        subtitle="Monitor farmer risk and insurance exposure."
        actions={
          <Link to="/insurance" className="btn-primary">
            Manage policies
            <ArrowRight size={16} />
          </Link>
        }
      />

      {highRiskCount > 0 ? (
        <div className="dash-alerts">
          <Link to="/insurance" className="dash-alert dash-alert--risk">
            <AlertCircle size={18} />
            <span>
              <strong>{highRiskCount} high-risk farmer{highRiskCount === 1 ? '' : 's'}</strong> may need
              stronger cover
            </span>
            <span className="dash-alert__action">Review policies</span>
          </Link>
        </div>
      ) : null}

      <div className="widgets four">
        <StatCard title="Monitored farmers" value={farmers.length.toLocaleString()} meta="Consented" />
        <StatCard
          title="High risk"
          value={highRiskCount.toLocaleString()}
          meta="Priority review"
          accent="amber"
        />
        <StatCard
          title="Medium risk"
          value={mediumRiskCount.toLocaleString()}
          meta="Watch list"
          accent="blue"
        />
        <StatCard title="Active policies" value={policyCount.toLocaleString()} meta="On book" />
      </div>

      <div className="dash-section">
        <div className="dash-section__head">
          <h2>Quick actions</h2>
          <p>Insurance workflows</p>
        </div>
        <div className="dash-quick-grid dash-quick-grid--three">
          <QuickActionCard
            to="/insurance"
            title="Policies"
            description="Create and manage cover"
            icon={ShieldCheck}
          />
          <QuickActionCard
            to="/payments"
            title="Payments"
            description="Premium & claim payments"
            icon={CreditCard}
          />
          <QuickActionCard
            to="/insurance"
            title="Risk review"
            description="Match cover to risk tiers"
            icon={Users}
          />
        </div>
      </div>

      <div className="dashboard-grid dashboard-grid--equal dashboard-grid--compact">
        <article className="card">
          <div className="section-head">
            <div>
              <h2>Risk distribution</h2>
              <p className="card-subtitle">Latest credit tiers across portfolio</p>
            </div>
          </div>
          <NeonSegmentChart rows={riskRows} emptyMessage="No risk data available yet." />
        </article>

        <article className="card">
          <div className="section-head">
            <div>
              <h2>Farmer portfolio</h2>
              <p className="card-subtitle">Suggested cover by risk (highest first)</p>
            </div>
            <Link to="/insurance" className="btn-view">
              Policies
            </Link>
          </div>
          <div className="table-scroll">
            <table className="desktop-table dashboard-table">
              <thead>
                <tr>
                  <th>Farmer</th>
                  <th>Risk</th>
                  <th>Suggested policy</th>
                </tr>
              </thead>
              <tbody>
                {previewFarmers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="empty-cell">
                      No consented farmers available yet.
                    </td>
                  </tr>
                ) : (
                  previewFarmers.map((farmer) => (
                    <tr key={farmer.farmerId}>
                      <td>
                        <strong className="dash-name">{farmer.fullName}</strong>
                      </td>
                      <td>
                        <StatusBadge value={farmer.riskLevel || 'Unknown'} />
                      </td>
                      <td>{suggestPolicy(farmer.riskLevel)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  )
}

export default InsurerDashboardPage
