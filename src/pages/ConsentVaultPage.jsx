import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import DataTableShell from '../components/ui/DataTableShell'
import {
  getConsentVaultDetail,
  listConsentVault,
  regenerateConsentCertificate,
} from '../services/bankabilityService'

/**
 * OTP Consent Vault for BANK / ADMIN.
 * Step flow: list certificates → open OTP history → download PDF → regenerate if needed.
 */
function ConsentVaultPage() {
  const [entries, setEntries] = useState([])
  const [selected, setSelected] = useState(null)
  const [history, setHistory] = useState([])
  const [farmerFilter, setFarmerFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)

  const apiOrigin = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/api\/?$/, '')

  const load = async () => {
    setLoading(true)
    try {
      const farmerId = farmerFilter.trim() ? Number(farmerFilter.trim()) : null
      const data = await listConsentVault(farmerId || undefined)
      setEntries(Array.isArray(data) ? data : [])
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to load consent vault')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openDetail = async (id) => {
    setDetailLoading(true)
    try {
      const detail = await getConsentVaultDetail(id)
      setSelected(detail)
      setHistory(Array.isArray(detail?.otpHistory) ? detail.otpHistory : [])
    } catch {
      toast.error('Could not load consent detail')
    } finally {
      setDetailLoading(false)
    }
  }

  const openPdf = (url) => {
    if (!url) {
      toast.info('No certificate file yet')
      return
    }
    window.open(url.startsWith('http') ? url : `${apiOrigin}${url}`, '_blank')
  }

  const onRegenerate = async (id) => {
    try {
      const updated = await regenerateConsentCertificate(id)
      toast.success(`Certificate ${updated.certificateRef || id} regenerated`)
      await load()
      await openDetail(id)
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Regenerate failed')
    }
  }

  const verifiedCount = entries.filter((e) => e.otpVerified).length
  const pendingCount = entries.length - verifiedCount
  const withCert = entries.filter((e) => e.consentDocumentUrl).length

  const filtered = useMemo(() => {
    if (statusFilter === 'verified') return entries.filter((e) => e.otpVerified)
    if (statusFilter === 'pending') return entries.filter((e) => !e.otpVerified)
    return entries
  }, [entries, statusFilter])

  const fmtWhen = (value) => {
    if (!value) return '—'
    return String(value).replace('T', ' ').slice(0, 19)
  }

  return (
    <section className="dashboard-page">
      <PageHeader
        breadcrumb="Bankability › Consent"
        title="OTP Consent Vault"
        subtitle="Buyer OTP consents with audit history and PDF certificates for underwriting."
        actions={
          <button type="button" className="btn-primary" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />

      <div className="widgets four">
        <StatCard title="Vault entries" value={String(entries.length)} />
        <StatCard title="OTP verified" value={String(verifiedCount)} accent="green" />
        <StatCard title="Pending OTP" value={String(pendingCount)} accent="amber" />
        <StatCard title="PDF certificates" value={String(withCert)} />
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            load()
          }}
          className="flex flex-wrap items-end gap-2"
        >
          <label className="flex flex-col gap-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Farmer ID
            <input
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
              placeholder="Optional"
              value={farmerFilter}
              onChange={(e) => setFarmerFilter(e.target.value)}
              inputMode="numeric"
            />
          </label>
          <button type="submit" className="btn-secondary">
            Apply filter
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: `All (${entries.length})` },
            { key: 'verified', label: `Verified (${verifiedCount})` },
            { key: 'pending', label: `Pending (${pendingCount})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={statusFilter === tab.key ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setStatusFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,1fr)]">
        <DataTableShell title={loading ? 'Loading certificates…' : 'Consent certificates'}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Certificate</th>
                <th>Contract</th>
                <th>Farmer</th>
                <th>Buyer</th>
                <th>Status</th>
                <th>Verified</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    {loading
                      ? 'Loading…'
                      : 'No consents in this view. They appear after buyer OTP verification.'}
                  </td>
                </tr>
              ) : (
                filtered.map((e) => {
                  const active = selected?.legalConsentId === e.legalConsentId
                  return (
                    <tr
                      key={e.legalConsentId}
                      style={
                        active
                          ? { background: 'color-mix(in srgb, var(--brand, #00450d) 10%, transparent)' }
                          : undefined
                      }
                    >
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          {e.certificateRef || `#${e.legalConsentId}`}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {e.consentType || 'consent'}
                        </div>
                      </td>
                      <td>#{e.contractId}</td>
                      <td>#{e.farmerId || '—'}</td>
                      <td>
                        <div>{e.partyName || '—'}</div>
                        {e.partyPhone ? (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.partyPhone}</div>
                        ) : null}
                      </td>
                      <td>
                        <StatusBadge value={e.otpVerified ? 'verified' : 'pending'} />
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                        {e.otpVerified ? fmtWhen(e.verifiedAt) : '—'}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => openDetail(e.legalConsentId)}
                          >
                            Open
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => openPdf(e.consentDocumentUrl)}
                            disabled={!e.consentDocumentUrl}
                          >
                            PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </DataTableShell>

        <aside className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="m-0 text-base font-semibold">Certificate detail</h3>
              <p className="m-0 mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                OTP audit trail and underwriting evidence
              </p>
            </div>
            {selected ? (
              <button type="button" className="btn-secondary" onClick={() => { setSelected(null); setHistory([]) }}>
                Close
              </button>
            ) : null}
          </div>

          {detailLoading ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading detail…</p>
          ) : !selected ? (
            <div
              className="rounded-lg border border-dashed border-[var(--border)] p-6 text-center text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              Select <strong>Open</strong> on a certificate to review OTP history, hash, and PDF actions.
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="text-lg font-semibold">
                  {selected.certificateRef || `#${selected.legalConsentId}`}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge value={selected.otpVerified ? 'verified' : 'pending'} />
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {selected.consentType || 'consent'} · contract #{selected.contractId}
                  </span>
                </div>
              </div>

              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt style={{ color: 'var(--text-muted)' }}>Buyer</dt>
                  <dd className="m-0 mt-1 font-medium">{selected.partyName || '—'}</dd>
                </div>
                <div>
                  <dt style={{ color: 'var(--text-muted)' }}>Farmer</dt>
                  <dd className="m-0 mt-1 font-medium">#{selected.farmerId || '—'}</dd>
                </div>
                <div>
                  <dt style={{ color: 'var(--text-muted)' }}>Verified at</dt>
                  <dd className="m-0 mt-1">{fmtWhen(selected.verifiedAt)}</dd>
                </div>
                <div>
                  <dt style={{ color: 'var(--text-muted)' }}>OTP sent</dt>
                  <dd className="m-0 mt-1">{fmtWhen(selected.otpSentAt)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt style={{ color: 'var(--text-muted)' }}>Channels</dt>
                  <dd className="m-0 mt-1">{selected.deliveryChannels || '—'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt style={{ color: 'var(--text-muted)' }}>Certificate hash</dt>
                  <dd
                    className="m-0 mt-1 break-all font-mono text-xs"
                    style={{ color: 'var(--text-secondary, var(--text-muted))' }}
                  >
                    {selected.certificateHash || '—'}
                  </dd>
                </div>
              </dl>

              {selected.consentText ? (
                <div
                  className="rounded-lg p-3 text-sm"
                  style={{ background: 'var(--surface-muted, #f3f4f6)', color: 'var(--text-secondary)' }}
                >
                  {selected.consentText}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => openPdf(selected.consentDocumentUrl)}
                  disabled={!selected.consentDocumentUrl}
                >
                  Download PDF
                </button>
                {selected.otpVerified ? (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => onRegenerate(selected.legalConsentId)}
                  >
                    Regenerate PDF
                  </button>
                ) : null}
              </div>

              <div>
                <h4 className="mb-3 mt-2 text-sm font-semibold">OTP event history</h4>
                {history.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    No OTP events recorded.
                  </p>
                ) : (
                  <ol className="m-0 space-y-3 p-0" style={{ listStyle: 'none' }}>
                    {history.map((h, idx) => (
                      <li
                        key={h.eventId || `${h.eventType}-${idx}`}
                        className="relative border-l-2 border-[var(--border)] pl-4"
                      >
                        <span
                          className="absolute left-[-5px] top-1.5 h-2.5 w-2.5 rounded-full"
                          style={{ background: 'var(--brand, #00450d)' }}
                        />
                        <div className="text-sm font-semibold">{h.eventType}</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {fmtWhen(h.createdAt)}
                          {h.actorRole ? ` · ${h.actorRole}` : ''}
                        </div>
                        {h.detail ? (
                          <div className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                            {h.detail}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}

export default ConsentVaultPage
