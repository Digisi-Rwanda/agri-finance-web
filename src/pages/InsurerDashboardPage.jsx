import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import GaugeStat from '../components/dashboard/GaugeStat'
import NeonAreaChart from '../components/dashboard/NeonAreaChart'
import NeonSegmentChart from '../components/dashboard/NeonSegmentChart'
import PageHeader from '../components/ui/PageHeader'
import StatusBadge from '../components/ui/StatusBadge'
import { getAnalyticsOverview } from '../services/analyticsService'
import { getFarmers, enrichFarmersWithInsights } from '../services/farmerService'
import { usePortalTheme } from '../context/PortalThemeContext'
import { buildOverviewTrend, calcGaugePct, getGaugeColors, mapCountsToBarRows } from '../utils/dashboard'

function suggestPolicy(riskLevel = '') {
  const risk = riskLevel.toLowerCase()
  if (risk === 'high') return 'Flood protection'
  if (risk === 'medium') return 'Crop protection'
  return 'Basic crop cover'
}

function InsurerDashboardPage() {
  const { isDark } = usePortalTheme()
  const gaugeColors = getGaugeColors(isDark)
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
  const trendData = buildOverviewTrend(overview, farmers.length)
  const previewFarmers = farmers.slice(0, 10)
  const gaugeMax = Math.max(farmers.length, highRiskCount, policyCount, 1)

  if (loading) {
    return (
      <section className="dashboard-page">
        <PageHeader title="Insurer dashboard" subtitle="Loading…" />
        <div className="widgets three">
          {[1, 2, 3].map((id) => (
            <article key={id} className="widget card dashboard-skeleton" />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="dashboard-page">
      <PageHeader
        subtitle="Monitor farmer risk and insurance exposure."
        actions={
          <Link to="/insurance" className="btn-primary">
            Manage policies
          </Link>
        }
      />

      <div className="widgets neon-top-row neon-top-row--three">
        <GaugeStat
          title="Monitored"
          value={farmers.length.toLocaleString()}
          pct={calcGaugePct(farmers.length, gaugeMax)}
          color={gaugeColors[0]}
        />
        <GaugeStat
          title="High risk"
          value={highRiskCount.toLocaleString()}
          pct={calcGaugePct(highRiskCount, gaugeMax)}
          color={gaugeColors[1]}
        />
        <GaugeStat
          title="Policies"
          value={policyCount.toLocaleString()}
          pct={calcGaugePct(policyCount, gaugeMax)}
          color={gaugeColors[2]}
        />
      </div>

      <div className="dashboard-grid">
        <article className="card">
          <h2>Exposure trend</h2>
          <p className="card-subtitle">Farmers, farms, and policy volume</p>
          <NeonAreaChart data={trendData} />
        </article>
        <article className="card">
          <h2>Risk distribution</h2>
          <p className="card-subtitle">Latest credit tiers</p>
          <NeonSegmentChart rows={riskRows} emptyMessage="No risk data available yet." />
        </article>
      </div>

      <article className="card">
        <h2>Farmer portfolio</h2>
        <p className="card-subtitle">Suggested cover by risk tier</p>
        <div className="table-shell">
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
        </div>
      </article>
    </section>
  )
}

export default InsurerDashboardPage
