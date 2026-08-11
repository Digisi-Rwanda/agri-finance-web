import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import { usePageCopy } from '../context/AuthLocaleContext'
import { formatRwf } from '../utils/currency'
import {
  fetchPaymentWatchSummary,
  recordPaymentWatchReceived,
  scanPaymentWatchOverdue,
} from '../services/bankabilityService'

function daysRelativeToDue(dueDate) {
  if (!dueDate) return null
  const due = new Date(`${String(dueDate).slice(0, 10)}T12:00:00`)
  if (Number.isNaN(due.getTime())) return null
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / 86400000)
}

function PaymentWatchPage() {
  const { s, p } = usePageCopy('paymentWatch')
  const [summary, setSummary] = useState(null)
  const [watches, setWatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [filter, setFilter] = useState('needs_attention')
  const [selectedId, setSelectedId] = useState(null)
  const [amount, setAmount] = useState('')
  const [replace, setReplace] = useState(false)
  const [posting, setPosting] = useState(false)
  const receiptRef = useRef(null)

  const dueLabel = (dueDate, status) => {
    const days = daysRelativeToDue(dueDate)
    if (days == null) return p.noDueDate
    if (String(status).toLowerCase() === 'overdue' || days < 0) {
      return p.overdue(Math.abs(days))
    }
    if (days === 0) return p.dueToday
    return p.dueIn(days)
  }

  const load = async () => {
    setLoading(true)
    try {
      const sum = await fetchPaymentWatchSummary()
      setSummary(sum || null)
      setWatches(Array.isArray(sum?.watches) ? sum.watches : [])
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || p.loadFailed)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const counts = useMemo(() => {
    const by = { watching: 0, partial: 0, overdue: 0, unmatched: 0, matched: 0 }
    watches.forEach((w) => {
      const st = String(w.status || 'watching').toLowerCase()
      if (by[st] != null) by[st] += 1
      else by.watching += 1
    })
    return by
  }, [watches])

  const needsAttention = useMemo(
    () =>
      watches.filter((w) =>
        ['overdue', 'unmatched', 'partial'].includes(String(w.status || '').toLowerCase()),
      ),
    [watches],
  )

  const visible = useMemo(() => {
    if (filter === 'needs_attention') return needsAttention
    if (filter === 'all') return watches
    return watches.filter((w) => String(w.status || '').toLowerCase() === filter)
  }, [filter, watches, needsAttention])

  const selected = watches.find((w) => Number(w.watchId) === Number(selectedId)) || null

  const openReceipt = (watch) => {
    const gap = Number(watch.outstandingGap ?? Math.max(Number(watch.expectedAmount || 0) - Number(watch.receivedAmount || 0), 0))
    setSelectedId(watch.watchId)
    setAmount(gap > 0 ? String(gap) : '')
    setReplace(false)
    window.setTimeout(() => {
      receiptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 40)
  }

  const closeReceipt = () => {
    setSelectedId(null)
    setAmount('')
    setReplace(false)
  }

  const onPostReceipt = async (e) => {
    e.preventDefault()
    if (!selectedId || !amount) return
    setPosting(true)
    try {
      await recordPaymentWatchReceived(Number(selectedId), Number(amount), replace)
      toast.success(replace ? p.receiptUpdated : p.receiptPosted)
      closeReceipt()
      await load()
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || p.receiptFailed)
    } finally {
      setPosting(false)
    }
  }

  const onScanAlerts = async () => {
    setScanning(true)
    try {
      const result = await scanPaymentWatchOverdue()
      toast.success(p.scanSuccess(result.alerted ?? 0, result.overdue ?? 0))
    } catch (err) {
      toast.error(err?.response?.data?.error || p.scanFailed)
    } finally {
      await load()
      setScanning(false)
    }
  }

  const progressOf = (w) => {
    if (w.progressPercent != null) return Math.min(100, Math.max(0, Number(w.progressPercent)))
    const expected = Number(w.expectedAmount || 0)
    const received = Number(w.receivedAmount || 0)
    if (expected <= 0) return 0
    return Math.min(100, Math.round((received / expected) * 100))
  }

  const toneClass = (status) => {
    const st = String(status || '').toLowerCase()
    if (st === 'overdue' || st === 'unmatched') return 'pw-card--alert'
    if (st === 'partial') return 'pw-card--warn'
    if (st === 'matched') return 'pw-card--ok'
    return ''
  }

  const filterTabs = [
    { key: 'needs_attention', label: p.filterNeedsAttention(needsAttention.length) },
    { key: 'overdue', label: p.filterOverdue(counts.overdue) },
    { key: 'partial', label: p.filterPartial(counts.partial) },
    { key: 'watching', label: p.filterWatching(counts.watching) },
    { key: 'matched', label: p.filterMatched(counts.matched) },
    { key: 'unmatched', label: p.filterUnmatched(counts.unmatched) },
    { key: 'all', label: p.filterAll(watches.length) },
  ]

  return (
    <section className="dashboard-page dashboard-page--compact payment-watch-page">
      <PageHeader
        title={p.title}
        subtitle={p.subtitle}
        actions={
          <button type="button" className="btn-secondary" onClick={onScanAlerts} disabled={scanning || loading}>
            {scanning || loading ? s.refreshing : s.refresh}
          </button>
        }
      />

      <div className="widgets four">
        <StatCard title={p.expected} value={formatRwf(summary?.expectedTotal)} meta={p.expectedMeta} />
        <StatCard title={p.received} value={formatRwf(summary?.receivedTotal)} accent="green" />
        <StatCard title={p.stillOwed} value={formatRwf(summary?.outstandingGap)} accent="amber" />
        <StatCard
          title={p.needsAttention}
          value={String(needsAttention.length)}
          meta={p.needsAttentionMeta(counts.overdue, counts.unmatched)}
        />
      </div>

      <div className="pw-filters">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={filter === tab.key ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {selected ? (
        <form className="pw-receipt" ref={receiptRef} onSubmit={onPostReceipt}>
          <div className="pw-receipt__head">
            <div>
              <p className="pw-receipt__eyebrow">{p.recordReceipt}</p>
              <h2>
                Watch #{selected.watchId}
                <span> · Contract #{selected.contractId}</span>
              </h2>
              <p className="pw-receipt__meta">
                {p.colExpected} {formatRwf(selected.expectedAmount)} · {p.colReceived}{' '}
                {formatRwf(selected.receivedAmount)} · {p.colGap} {formatRwf(selected.outstandingGap)}
              </p>
            </div>
            <button type="button" className="btn-secondary" onClick={closeReceipt}>
              {s.close}
            </button>
          </div>

          <div className="pw-receipt__grid">
            <label>
              {p.amountReceived}
              <input
                type="number"
                min="0"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                required
              />
            </label>
            <label className="pw-receipt__check">
              <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
              {p.replaceTotal}
            </label>
          </div>

          <div className="pw-receipt__actions">
            <button type="submit" className="btn-primary" disabled={posting}>
              {posting ? p.posting : p.postReceipt}
            </button>
            {Number(selected.outstandingGap) > 0 ? (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setAmount(String(selected.outstandingGap))}
              >
                {p.fillGap}
              </button>
            ) : null}
          </div>
        </form>
      ) : null}

      <section className="pw-list">
        {loading && watches.length === 0 ? (
          <div className="pw-empty">{p.loading}</div>
        ) : null}
        {!loading && visible.length === 0 ? (
          <div className="pw-empty">
            {filter === 'needs_attention' ? p.healthy : p.emptyFilter}
          </div>
        ) : null}

        <div className="pw-card-list">
          {visible.map((w) => {
            const pct = progressOf(w)
            const status = String(w.status || 'watching').toLowerCase()
            const isSelected = Number(selectedId) === Number(w.watchId)
            const canReceive = ['watching', 'partial', 'overdue', 'unmatched'].includes(status)

            return (
              <article
                key={w.watchId}
                className={`pw-card ${toneClass(status)}${isSelected ? ' is-selected' : ''}`}
              >
                <div className="pw-card__top">
                  <div>
                    <h3>
                      Contract #{w.contractId}
                      <span className="pw-card__sub"> · Watch #{w.watchId}</span>
                    </h3>
                    <p className="pw-card__meta">
                      Farmer #{w.farmerId || '—'}
                      {w.expectedAccount ? ` · ${w.expectedAccount}` : ''}
                    </p>
                  </div>
                  <StatusBadge status={status} />
                </div>

                <div className="pw-card__amounts">
                  <div>
                    <span>{p.colExpected}</span>
                    <strong>{formatRwf(w.expectedAmount)}</strong>
                  </div>
                  <div>
                    <span>{p.colReceived}</span>
                    <strong>{formatRwf(w.receivedAmount)}</strong>
                  </div>
                  <div>
                    <span>{p.colGap}</span>
                    <strong>{formatRwf(w.outstandingGap)}</strong>
                  </div>
                </div>

                <div className="pw-progress" aria-hidden="true">
                  <div className="pw-progress__track">
                    <div
                      className={`pw-progress__fill pw-progress__fill--${status}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span>{pct}%</span>
                </div>

                <div className="pw-card__footer">
                  <span className={`pw-due pw-due--${status}`}>
                    {dueLabel(w.dueDate, status)}
                    {w.dueDate ? ` · ${String(w.dueDate).slice(0, 10)}` : ''}
                  </span>
                  {canReceive ? (
                    <button type="button" className="btn-primary" onClick={() => openReceipt(w)}>
                      {isSelected ? p.recording : p.recordReceipt}
                    </button>
                  ) : (
                    <span className="pw-card__done">{p.fullyMatched}</span>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </section>
  )
}

export default PaymentWatchPage
