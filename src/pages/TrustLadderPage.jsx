import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import { fetchTrustLadder } from '../services/bankabilityService'

/**
 * Trust Ladder (#8) for BANK / ADMIN — Bronze → Platinum with behavior metrics.
 */
function TrustLadderPage() {
  const [farmerId, setFarmerId] = useState('')
  const [ladder, setLadder] = useState(null)
  const [loading, setLoading] = useState(false)

  const loadLevels = async () => {
    try {
      const data = await fetchTrustLadder({ score: 0 })
      setLadder(data)
    } catch {
      toast.error('Could not load trust levels')
    }
  }

  useEffect(() => {
    loadLevels()
  }, [])

  const evaluateFarmer = async () => {
    if (!farmerId.trim()) {
      toast.info('Enter a farmer ID')
      return
    }
    setLoading(true)
    try {
      const data = await fetchTrustLadder({ farmerId: Number(farmerId) })
      setLadder(data)
      toast.success(`${data.tier} · score ${data.score}`)
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Evaluation failed')
    } finally {
      setLoading(false)
    }
  }

  const metrics = ladder?.metrics || {}
  const metricList = [
    metrics.repaymentHistory,
    metrics.savingsActivity,
    metrics.contractFulfillment,
    metrics.mobileMoneyBehavior,
  ].filter(Boolean)

  return (
    <section className="dashboard-page">
      <PageHeader
        breadcrumb="Bankability › Trust"
        title="Trust Ladder"
        subtitle="Reward strong repayment, savings, contract fulfillment, and mobile money behavior."
      />

      <div className="widgets four">
        <StatCard title="Current tier" value={ladder?.tier || '—'} />
        <StatCard title="Composite score" value={ladder?.score != null ? String(ladder.score) : '—'} />
        <StatCard title="Mode" value={ladder?.mode === 'farmer' ? 'Farmer metrics' : 'Levels'} />
        <StatCard
          title="Next"
          value={ladder?.nextTier?.tier ? String(ladder.nextTier.tier) : '—'}
        />
      </div>

      <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h3 className="mb-3 font-semibold">Evaluate farmer</h3>
        <div className="flex flex-wrap gap-2">
          <input
            className="rounded-lg border border-[var(--border)] bg-transparent p-2"
            placeholder="Farmer ID"
            value={farmerId}
            onChange={(e) => setFarmerId(e.target.value)}
          />
          <button type="button" className="btn-primary" onClick={evaluateFarmer} disabled={loading}>
            {loading ? 'Evaluating…' : 'Evaluate'}
          </button>
          <button type="button" className="btn-secondary" onClick={loadLevels}>
            Show all levels
          </button>
        </div>
        {ladder?.unlock ? (
          <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
            {ladder.unlock}
          </p>
        ) : null}
        {Array.isArray(ladder?.benefits) && ladder.benefits.length > 0 ? (
          <ul className="mt-2 list-disc pl-5 text-sm">
            {ladder.benefits.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        ) : null}
      </div>

      {metricList.length > 0 ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {metricList.map((m) => (
            <div key={m.label} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {m.label}
              </div>
              <div className="mt-1 text-2xl font-semibold">{m.score}</div>
              <div className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {m.detail}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-6 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="data-table">
          <thead>
            <tr>
              <th>Level</th>
              <th>Min score</th>
              <th>Benefits</th>
            </tr>
          </thead>
          <tbody>
            {(ladder?.levels || []).map((lvl) => (
              <tr
                key={lvl.tier}
                style={
                  ladder?.tier === lvl.tier
                    ? { background: 'color-mix(in srgb, var(--brand) 12%, transparent)' }
                    : undefined
                }
              >
                <td>
                  <strong>{lvl.tier}</strong>
                  {ladder?.tier === lvl.tier ? ' · current' : ''}
                </td>
                <td>{lvl.minScore}</td>
                <td>{(lvl.benefits || []).join(' · ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default TrustLadderPage
