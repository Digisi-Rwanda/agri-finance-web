import { AlertCircle, ArrowRight, CreditCard, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import NeonSegmentChart from '../components/dashboard/NeonSegmentChart'
import QuickActionCard from '../components/dashboard/QuickActionCard'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import { usePageCopy } from '../context/AuthLocaleContext'
import { getAnalyticsOverview } from '../services/analyticsService'
import { getFarmers, enrichFarmersWithInsights } from '../services/farmerService'
import { mapCountsToBarRows } from '../utils/dashboard'

function InsurerDashboardPage() {
  const { s, p } = usePageCopy('insurerDashboard')
  const [farmers, setFarmers] = useState([])
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)

  const suggestPolicy = (riskLevel = '') => {
    const risk = riskLevel.toLowerCase()
    if (risk === 'high') return p.flood
    if (risk === 'medium') return p.crop
    return p.basicCrop
  }

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
        <PageHeader title={p.title} subtitle={s.loading} />
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
        title={p.title}
        subtitle={p.subtitle}
        actions={
          <Link to="/insurance" className="btn-primary">
            {p.managePolicies}
            <ArrowRight size={16} />
          </Link>
        }
      />

      {highRiskCount > 0 ? (
        <div className="dash-alerts">
          <Link to="/insurance" className="dash-alert dash-alert--risk">
            <AlertCircle size={18} />
            <span>
              <strong>{p.highRiskAlert(highRiskCount)}</strong>
            </span>
            <span className="dash-alert__action">{p.reviewPolicies}</span>
          </Link>
        </div>
      ) : null}

      <div className="widgets four">
        <StatCard title={p.monitored} value={farmers.length.toLocaleString()} meta={p.monitoredMeta} />
        <StatCard
          title={p.highRisk}
          value={highRiskCount.toLocaleString()}
          meta={p.highRiskMeta}
          accent="amber"
        />
        <StatCard
          title={p.mediumRisk}
          value={mediumRiskCount.toLocaleString()}
          meta={p.mediumRiskMeta}
          accent="blue"
        />
        <StatCard title={p.activePolicies} value={policyCount.toLocaleString()} meta={p.activePoliciesMeta} />
      </div>

      <div className="dash-section">
        <div className="dash-section__head">
          <h2>{p.quickActions}</h2>
          <p>{p.workflows}</p>
        </div>
        <div className="dash-quick-grid">
          <QuickActionCard
            to="/insurance"
            title={p.policiesCard}
            description={p.policiesDesc}
            icon={ShieldCheck}
          />
          <QuickActionCard
            to="/payments"
            title={p.premiumsCard}
            description={p.premiumsDesc}
            icon={CreditCard}
          />
        </div>
      </div>

      <div className="dashboard-grid dashboard-grid--equal dashboard-grid--compact">
        <article className="card">
          <div className="section-head">
            <div>
              <h2>{p.riskDistribution}</h2>
              <p className="card-subtitle">{p.riskMeta}</p>
            </div>
          </div>
          <NeonSegmentChart rows={riskRows} emptyMessage={p.noRisk} />
        </article>

        <article className="card">
          <div className="section-head">
            <div>
              <h2>{p.farmerPortfolio}</h2>
              <p className="card-subtitle">{p.portfolioSubtitle}</p>
            </div>
            <Link to="/insurance" className="btn-view">
              {p.policiesCard}
            </Link>
          </div>
          <div className="table-scroll">
            <table className="desktop-table dashboard-table">
              <thead>
                <tr>
                  <th>{p.colFarmer}</th>
                  <th>{p.colRisk}</th>
                  <th>{p.colSuggested}</th>
                </tr>
              </thead>
              <tbody>
                {previewFarmers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="empty-cell">
                      {p.portfolioEmpty}
                    </td>
                  </tr>
                ) : (
                  previewFarmers.map((farmer) => (
                    <tr key={farmer.farmerId}>
                      <td>
                        <strong className="dash-name">{farmer.fullName}</strong>
                      </td>
                      <td>
                        <StatusBadge value={farmer.riskLevel || p.unknown} />
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
