import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import { usePageCopy } from '../context/AuthLocaleContext'
import { fetchTrustLadder } from '../services/bankabilityService'

function TrustLadderPage() {
  const { s, p } = usePageCopy('trustLadder')
  const [farmerId, setFarmerId] = useState('')
  const [ladder, setLadder] = useState(null)
  const [loading, setLoading] = useState(false)

  const loadLevels = async () => {
    try {
      const data = await fetchTrustLadder({ score: 0 })
      setLadder(data)
    } catch {
      toast.error(p.loadFailed)
    }
  }

  useEffect(() => {
    loadLevels()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const evaluateFarmer = async () => {
    if (!farmerId.trim()) {
      toast.info(p.enterFarmerId)
      return
    }
    setLoading(true)
    try {
      const data = await fetchTrustLadder({ farmerId: Number(farmerId) })
      setLadder(data)
      toast.success(p.evaluateSuccess(data.tier, data.score))
    } catch (e) {
      toast.error(e?.response?.data?.error || p.evaluateFailed)
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
    <section className="dashboard-page dashboard-page--compact">
      <PageHeader title={p.title} subtitle={p.subtitle} />

      <div className="widgets four">
        <StatCard title={p.currentTier} value={ladder?.tier || '—'} />
        <StatCard title={p.compositeScore} value={ladder?.score != null ? String(ladder.score) : '—'} />
        <StatCard title={p.mode} value={ladder?.mode === 'farmer' ? p.modeFarmer : p.modeLevels} />
        <StatCard title={p.next} value={ladder?.nextTier?.tier ? String(ladder.nextTier.tier) : '—'} />
      </div>

      <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h3 className="mb-3 font-semibold">{p.evaluateFarmer}</h3>
        <div className="flex flex-wrap gap-2">
          <input
            className="rounded-lg border border-[var(--border)] bg-transparent p-2"
            placeholder={p.farmerIdPlaceholder}
            value={farmerId}
            onChange={(e) => setFarmerId(e.target.value)}
          />
          <button type="button" className="btn-primary" onClick={evaluateFarmer} disabled={loading}>
            {loading ? p.evaluating : p.evaluate}
          </button>
          <button type="button" className="btn-secondary" onClick={loadLevels}>
            {p.showAllLevels}
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
              <th>{p.colLevel}</th>
              <th>{p.colMinScore}</th>
              <th>{p.colBenefits}</th>
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
                  {ladder?.tier === lvl.tier ? p.currentSuffix : ''}
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
