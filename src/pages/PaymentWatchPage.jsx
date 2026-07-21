import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import DataTableShell from '../components/ui/DataTableShell'
import { formatRwf } from '../utils/currency'
import {
  fetchPaymentWatchSummary,
  listOverduePaymentWatches,
  listPaymentWatches,
  listUnmatchedPaymentWatches,
  recordPaymentWatchReceived,
  scanPaymentWatchOverdue,
} from '../services/bankabilityService'

/**
 * Payment Watch hub for BANK / ADMIN.
 * Step flow: load summary → show overdue/unmatched queues → post receipts → refresh alerts.
 */
function PaymentWatchPage() {
  // Step 1: page state — summary KPIs + queue tables + receipt form
  const [summary, setSummary] = useState(null)
  const [overdue, setOverdue] = useState([])
  const [unmatched, setUnmatched] = useState([])
  const [watching, setWatching] = useState([])
  const [partial, setPartial] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('overdue')
  const [receiveForm, setReceiveForm] = useState({ watchId: '', amount: '', replace: false })

  // Step 2: load dashboard from backend (status engine refreshes on each call)
  const load = async () => {
    setLoading(true)
    try {
      const [sum, od, um, w, p] = await Promise.all([
        fetchPaymentWatchSummary(),
        listOverduePaymentWatches(),
        listUnmatchedPaymentWatches(),
        listPaymentWatches('watching'),
        listPaymentWatches('partial'),
      ])
      setSummary(sum || null)
      setOverdue(Array.isArray(od) ? od : [])
      setUnmatched(Array.isArray(um) ? um : [])
      setWatching(Array.isArray(w) ? w : [])
      setPartial(Array.isArray(p) ? p : [])
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to load payment watches')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  // Step 3: pick which queue table to show
  const tableRows = useMemo(() => {
    if (filter === 'unmatched') return unmatched
    if (filter === 'watching') return watching
    if (filter === 'partial') return partial
    if (filter === 'all') {
      return [...overdue, ...unmatched, ...partial, ...watching]
    }
    return overdue
  }, [filter, overdue, unmatched, watching, partial])

  // Step 4: post a receipt (accumulate by default; replace sets absolute total)
  const onRecordReceived = async (e) => {
    e.preventDefault()
    try {
      await recordPaymentWatchReceived(Number(receiveForm.watchId), Number(receiveForm.amount), receiveForm.replace)
      toast.success(receiveForm.replace ? 'Received amount set' : 'Receipt posted (accumulated)')
      setReceiveForm({ watchId: '', amount: '', replace: false })
      load()
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Could not record receipt')
    }
  }

  // Step 5: staff button — recompute statuses + notify farmers (once/day per watch)
  const onScanAlerts = async () => {
    try {
      const result = await scanPaymentWatchOverdue()
      toast.success(
        `Scan done: refreshed ${result.refreshed}, alerted ${result.alerted}, overdue ${result.overdue}`,
      )
      load()
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Scan failed')
    }
  }

  const statusBadge = (status) => {
    const s = String(status || 'watching').toLowerCase()
    const colors = {
      overdue: '#B45309',
      unmatched: '#B91C1C',
      matched: '#15803D',
      partial: '#1D4ED8',
      watching: '#64748B',
    }
    return (
      <span style={{ color: colors[s] || '#64748B', fontWeight: 600, textTransform: 'capitalize' }}>
        {s}
      </span>
    )
  }

  return (
    <section className="page-stack">
      {/* Step UI-1: header + alert refresh action */}
      <PageHeader
        title="Payment Watch"
        subtitle="Expected buyer remittances vs money received — overdue, partial, and unmatched queues."
        actions={
          <button type="button" className="btn-secondary" onClick={onScanAlerts} disabled={loading}>
            Refresh alerts
          </button>
        }
      />

      {/* Step UI-2: KPI strip from /payment-watches/summary */}
      <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
        <StatCard title="Expected" value={formatRwf(summary?.expectedTotal)} accent="green" />
        <StatCard title="Received" value={formatRwf(summary?.receivedTotal)} accent="green" />
        <StatCard title="Outstanding gap" value={formatRwf(summary?.outstandingGap)} accent="amber" />
        <StatCard title="Overdue" value={String(summary?.overdueCount ?? overdue.length)} accent="amber" />
        <StatCard title="Unmatched" value={String(summary?.unmatchedCount ?? unmatched.length)} />
        <StatCard title="Partial" value={String(summary?.partialCount ?? partial.length)} />
      </div>

      {/* Step UI-3: record receipt form */}
      <form
        onSubmit={onRecordReceived}
        className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 mt-6 space-y-3"
        style={{ maxWidth: 520 }}
      >
        <h3 className="font-semibold">Record receipt</h3>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
          Leave “replace” unchecked to accumulate partial payments toward the expected amount.
        </p>
        <input
          className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
          placeholder="Watch ID"
          value={receiveForm.watchId}
          onChange={(e) => setReceiveForm({ ...receiveForm, watchId: e.target.value })}
          required
        />
        <input
          className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
          placeholder="Amount received (RWF)"
          value={receiveForm.amount}
          onChange={(e) => setReceiveForm({ ...receiveForm, amount: e.target.value })}
          required
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <input
            type="checkbox"
            checked={receiveForm.replace}
            onChange={(e) => setReceiveForm({ ...receiveForm, replace: e.target.checked })}
          />
          Replace total (do not accumulate)
        </label>
        <button type="submit" className="btn-primary">
          Post receipt
        </button>
      </form>

      {/* Step UI-4: queue filter tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 24, marginBottom: 12 }}>
        {[
          { key: 'overdue', label: `Overdue (${overdue.length})` },
          { key: 'unmatched', label: `Unmatched (${unmatched.length})` },
          { key: 'partial', label: `Partial (${partial.length})` },
          { key: 'watching', label: `Watching (${watching.length})` },
          { key: 'all', label: 'All open' },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            className={filter === t.key ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setFilter(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Step UI-5: queue table */}
      <DataTableShell title={loading ? 'Loading…' : `Payment watches — ${filter}`}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Watch</th>
              <th>Contract</th>
              <th>Farmer</th>
              <th>Expected</th>
              <th>Received</th>
              <th>Gap</th>
              <th>Due</th>
              <th>Account</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {tableRows.length === 0 ? (
              <tr>
                <td colSpan={10}>No watches in this queue.</td>
              </tr>
            ) : (
              tableRows.map((w) => {
                const expected = Number(w.expectedAmount || 0)
                const received = Number(w.receivedAmount || 0)
                const gap = Math.max(expected - received, 0)
                return (
                  <tr key={w.watchId}>
                    <td>#{w.watchId}</td>
                    <td>#{w.contractId}</td>
                    <td>#{w.farmerId}</td>
                    <td>{formatRwf(expected)}</td>
                    <td>{formatRwf(received)}</td>
                    <td>{formatRwf(gap)}</td>
                    <td>{w.dueDate ? String(w.dueDate).slice(0, 10) : '—'}</td>
                    <td>{w.expectedAccount || '—'}</td>
                    <td>{statusBadge(w.status)}</td>
                    <td>
                      {['watching', 'partial', 'overdue'].includes(String(w.status || '').toLowerCase()) ? (
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() =>
                            setReceiveForm({
                              watchId: String(w.watchId),
                              amount: String(gap || expected),
                              replace: false,
                            })
                          }
                        >
                          Fill receipt
                        </button>
                      ) : null}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </DataTableShell>
    </section>
  )
}

export default PaymentWatchPage
