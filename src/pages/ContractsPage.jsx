import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import DataTableShell from '../components/ui/DataTableShell'
import {
  listContracts,
  listContractConsents,
  startBuyerConsent,
} from '../services/bankabilityService'

/** Stages where buyer OTP is still the next staff action. */
function needsBuyerOtp(status) {
  const s = String(status || '').toLowerCase()
  return (
    !s ||
    s === 'draft' ||
    s === 'submitted' ||
    s === 'buyer_verification_pending' ||
    (s.includes('buyer') && !s.includes('field') && !s.includes('disput'))
  )
}

function stageHint(status) {
  const s = String(status || '').toLowerCase()
  if (s.includes('disput')) return 'Disputed — create a new contract if needed'
  if (s.includes('buyer') || s === 'draft' || s === 'submitted') return 'Send buyer OTP link'
  if (s.includes('field_inspection')) return 'Inspector field visit'
  if (s === 'verified') return 'Ready as loan collateral'
  return 'In progress'
}

function formatValue(value) {
  if (value == null || value === '') return '—'
  const n = Number(value)
  if (Number.isFinite(n)) return `${n.toLocaleString()} Rwf`
  return String(value)
}

/**
 * Receivables = purchase contracts used as collateral.
 * Focus: status + one clear next action (OTP → inspections → verified).
 */
function ContractsPage() {
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const load = async () => {
    setLoading(true)
    try {
      const data = await listContracts()
      setContracts(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Failed to load contracts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const counts = useMemo(() => {
    const all = contracts.length
    const verified = contracts.filter((c) => c.status === 'verified').length
    const inspection = contracts.filter((c) =>
      String(c.status || '').toLowerCase().includes('field_inspection'),
    ).length
    const pendingBuyer = contracts.filter((c) => needsBuyerOtp(c.status)).length
    const disputed = contracts.filter((c) =>
      String(c.status || '').toLowerCase().includes('disput'),
    ).length
    return { all, verified, inspection, pendingBuyer, disputed }
  }, [contracts])

  const visible = useMemo(() => {
    if (filter === 'buyer') return contracts.filter((c) => needsBuyerOtp(c.status))
    if (filter === 'inspection') {
      return contracts.filter((c) =>
        String(c.status || '').toLowerCase().includes('field_inspection'),
      )
    }
    if (filter === 'verified') return contracts.filter((c) => c.status === 'verified')
    if (filter === 'disputed') {
      return contracts.filter((c) => String(c.status || '').toLowerCase().includes('disput'))
    }
    return contracts
  }, [contracts, filter])

  const onStartOtp = async (id) => {
    try {
      const res = await startBuyerConsent(id)
      const link = res.verificationLink || `/buyer-verify?contractId=${id}`
      const absolute = link.startsWith('http')
        ? link
        : `${window.location.origin}${link.startsWith('/') ? link : `/${link}`}`
      try {
        await navigator.clipboard.writeText(absolute)
      } catch {
        /* clipboard optional */
      }
      toast.success(
        res.otpCode
          ? `Buyer link copied. OTP ${res.otpCode} (use if email/SMS not sent).`
          : 'Buyer verification link copied — send it to the buyer.',
      )
      toast.info(absolute, { autoClose: 12000 })
      load()
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.response?.data?.message || 'OTP failed')
    }
  }

  const onViewConsent = async (id) => {
    try {
      const list = await listContractConsents(id)
      const consent = Array.isArray(list) ? list[0] : null
      if (!consent) {
        toast.info('No consent PDF yet — buyer must complete OTP first')
        return
      }
      const doc = consent.consentDocumentUrl
      const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/api\/?$/, '')
      if (doc) {
        window.open(doc.startsWith('http') ? doc : `${base}${doc}`, '_blank')
      } else if (consent.otpVerified) {
        toast.info('OTP verified — open Consent Vault if PDF is still generating')
      } else {
        toast.info('Consent pending — buyer has not completed OTP yet')
      }
    } catch {
      toast.error('Could not load consent')
    }
  }

  return (
    <section className="dashboard-page">
      <PageHeader
        breadcrumb="Bankability › Receivables"
        title="Receivables"
        subtitle="Purchase contracts used as loan collateral. Send buyer OTP, then field inspection, then verified."
        actions={
          <button type="button" className="btn-primary" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />

      <div className="widgets four">
        <StatCard title="Pending buyer" value={String(counts.pendingBuyer)} meta="Need OTP link" />
        <StatCard title="Field inspection" value={String(counts.inspection)} meta="Go to Inspections" />
        <StatCard title="Verified" value={String(counts.verified)} meta="Loan-ready" />
        <StatCard title="Disputed" value={String(counts.disputed)} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { key: 'all', label: `All (${counts.all})` },
          { key: 'buyer', label: `Need OTP (${counts.pendingBuyer})` },
          { key: 'inspection', label: `Inspection (${counts.inspection})` },
          { key: 'verified', label: `Verified (${counts.verified})` },
          { key: 'disputed', label: `Disputed (${counts.disputed})` },
        ].map((tab) => (
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

      <div className="mt-6">
        <DataTableShell title="Contracts">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Buyer</th>
                <th>Value</th>
                <th>Status</th>
                <th>Next step</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && visible.length === 0 ? (
                <tr>
                  <td colSpan={6}>Loading…</td>
                </tr>
              ) : null}
              {!loading && visible.length === 0 ? (
                <tr>
                  <td colSpan={6}>No contracts in this filter.</td>
                </tr>
              ) : null}
              {visible.map((c) => {
                const otpNeeded = needsBuyerOtp(c.status)
                const inspection = String(c.status || '')
                  .toLowerCase()
                  .includes('field_inspection')
                const verified = String(c.status || '').toLowerCase() === 'verified'
                const disputed = String(c.status || '').toLowerCase().includes('disput')

                return (
                  <tr key={c.contractId}>
                    <td>#{c.contractId}</td>
                    <td>{c.buyerName || '—'}</td>
                    <td>{formatValue(c.contractValue)}</td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      {stageHint(c.status)}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        {otpNeeded ? (
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={() => onStartOtp(c.contractId)}
                          >
                            Send buyer OTP link
                          </button>
                        ) : null}
                        {inspection ? (
                          <Link to="/inspections" className="btn-primary">
                            Go to inspections
                          </Link>
                        ) : null}
                        {verified ? (
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => onViewConsent(c.contractId)}
                          >
                            Consent PDF
                          </button>
                        ) : null}
                        {disputed ? (
                          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                            Closed
                          </span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </DataTableShell>
      </div>
    </section>
  )
}

export default ContractsPage
