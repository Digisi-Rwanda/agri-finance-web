import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import DataTableShell from '../components/ui/DataTableShell'
import { usePageCopy } from '../context/AuthLocaleContext'
import {
  listContracts,
  listContractConsents,
  startBuyerConsent,
} from '../services/bankabilityService'

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

function formatValue(value) {
  if (value == null || value === '') return '—'
  const n = Number(value)
  if (Number.isFinite(n)) return `${n.toLocaleString()} Rwf`
  return String(value)
}

function ContractsPage() {
  const { s, p } = usePageCopy('contracts')
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const stageHint = (status) => {
    const st = String(status || '').toLowerCase()
    if (st.includes('disput')) return p.stageDisputed
    if (st.includes('buyer') || st === 'draft' || st === 'submitted') return p.stageOtp
    if (st.includes('field_inspection')) return p.stageInspection
    if (st === 'verified') return p.stageVerified
    return p.stageProgress
  }

  const load = async () => {
    setLoading(true)
    try {
      const data = await listContracts()
      setContracts(Array.isArray(data) ? data : [])
    } catch {
      toast.error(p.loadFailed)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        res.otpCode ? p.otpCopiedWithCode(res.otpCode) : p.otpCopied,
      )
      toast.info(absolute, { autoClose: 12000 })
      load()
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.response?.data?.message || p.otpFailed)
    }
  }

  const onViewConsent = async (id) => {
    try {
      const list = await listContractConsents(id)
      const consent = Array.isArray(list) ? list[0] : null
      if (!consent) {
        toast.info(p.noConsentPdf)
        return
      }
      const doc = consent.consentDocumentUrl
      const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/api\/?$/, '')
      if (doc) {
        window.open(doc.startsWith('http') ? doc : `${base}${doc}`, '_blank')
      } else if (consent.otpVerified) {
        toast.info(p.consentVerified)
      } else {
        toast.info(p.consentPending)
      }
    } catch {
      toast.error(p.consentLoadFailed)
    }
  }

  const filterTabs = [
    { key: 'all', label: p.filterAll(counts.all) },
    { key: 'buyer', label: p.filterNeedOtp(counts.pendingBuyer) },
    { key: 'inspection', label: p.filterInspection(counts.inspection) },
    { key: 'verified', label: p.filterVerified(counts.verified) },
    { key: 'disputed', label: p.filterDisputed(counts.disputed) },
  ]

  return (
    <section className="dashboard-page dashboard-page--compact">
      <PageHeader
        title={p.title}
        subtitle={p.subtitle}
        actions={
          <button type="button" className="btn-primary" onClick={load} disabled={loading}>
            {loading ? s.refreshing : s.refresh}
          </button>
        }
      />

      <div className="widgets four">
        <StatCard title={p.pendingBuyer} value={String(counts.pendingBuyer)} meta={p.pendingBuyerMeta} />
        <StatCard title={p.fieldInspection} value={String(counts.inspection)} meta={p.fieldInspectionMeta} />
        <StatCard title={p.verified} value={String(counts.verified)} meta={p.verifiedMeta} />
        <StatCard title={p.disputed} value={String(counts.disputed)} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
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

      <div className="mt-6">
        <DataTableShell title={p.tableTitle}>
          <table className="data-table">
            <thead>
              <tr>
                <th>{p.colId}</th>
                <th>{p.colBuyer}</th>
                <th>{p.colValue}</th>
                <th>{p.colStatus}</th>
                <th>{p.colNext}</th>
                <th>{p.colAction}</th>
              </tr>
            </thead>
            <tbody>
              {loading && visible.length === 0 ? (
                <tr>
                  <td colSpan={6}>{s.loading}</td>
                </tr>
              ) : null}
              {!loading && visible.length === 0 ? (
                <tr>
                  <td colSpan={6}>{p.empty}</td>
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
                            {p.sendOtp}
                          </button>
                        ) : null}
                        {inspection ? (
                          <Link to="/inspections" className="btn-primary">
                            {p.goInspections}
                          </Link>
                        ) : null}
                        {verified ? (
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => onViewConsent(c.contractId)}
                          >
                            {p.consentPdf}
                          </button>
                        ) : null}
                        {disputed ? (
                          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                            {p.closed}
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
