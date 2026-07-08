import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import NeonSegmentChart from '../components/dashboard/NeonSegmentChart'
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

  const policyCount = Number(overview?.insurancePolicies || 0)
  const riskRows = mapCountsToBarRows(overview?.creditRiskLatestByTier)
  const previewFarmers = farmers.slice(0, 6)

  if (loading) {
    return (
      <section className="dashboard-page dashboard-page--compact">
        <PageHeader title="Dashboard" subtitle="Loading…" />
        <div className="widgets three">
          {[1, 2, 3].map((id) => (
            <article key={id} className="widget card dashboard-skeleton" />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="dashboard-page dashboard-page--compact">
      <PageHeader
        breadcrumb="Home › Dashboard"
        subtitle="Monitor farmer risk and insurance exposure."
        actions={
          <Link to="/insurance" className="btn-primary">
            Manage policies
          </Link>
        }
      />

      <div className="widgets three">
        <StatCard title="Monitored farmers" value={farmers.length.toLocaleString()} />
        <StatCard title="High risk" value={highRiskCount.toLocaleString()} />
        <StatCard title="Active policies" value={policyCount.toLocaleString()} />
      </div>

      <div className="dashboard-grid dashboard-grid--compact">
        <article className="card">
          <h2>Risk distribution</h2>
          <p className="card-subtitle">Latest credit tiers across portfolio</p>
          <NeonSegmentChart rows={riskRows} emptyMessage="No risk data available yet." />
        </article>

        <article className="card">
          <div className="section-head">
            <div>
              <h2>Farmer portfolio</h2>
              <p className="card-subtitle">Suggested cover by risk tier</p>
            </div>
            <Link to="/insurance" className="btn-view">
              View policies
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
                      <td>{farmer.fullName}</td>
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
