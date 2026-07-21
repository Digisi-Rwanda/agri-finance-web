import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
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
  // Step 1: page state
  const [entries, setEntries] = useState([])
  const [selected, setSelected] = useState(null)
  const [history, setHistory] = useState([])
  const [farmerFilter, setFarmerFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const apiOrigin = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/api\/?$/, '')

  // Step 2: load vault list
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

  // Step 3: open detail + OTP verification history
  const openDetail = async (id) => {
    try {
      const detail = await getConsentVaultDetail(id)
      setSelected(detail)
      setHistory(Array.isArray(detail?.otpHistory) ? detail.otpHistory : [])
    } catch {
      toast.error('Could not load consent detail')
    }
  }

  // Step 4: open downloadable PDF certificate
  const openPdf = (url) => {
    if (!url) {
      toast.info('No certificate file yet')
      return
    }
    window.open(url.startsWith('http') ? url : `${apiOrigin}${url}`, '_blank')
  }

  // Step 5: staff regenerate certificate PDF
  const onRegenerate = async (id) => {
    try {
      const updated = await regenerateConsentCertificate(id)
      toast.success(`Certificate ${updated.certificateRef || id} regenerated`)
      load()
      openDetail(id)
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Regenerate failed')
    }
  }

  const verifiedCount = entries.filter((e) => e.otpVerified).length
  const withCert = entries.filter((e) => e.consentDocumentUrl).length

  return (
    <section className="page-stack">
      <PageHeader
        title="OTP Consent Vault"
        subtitle="Legally verifiable buyer OTP consents — history, PDF certificates, underwriting evidence."
        actions={
          <button type="button" className="btn-primary" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />

      <div
        className="stat-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}
      >
        <StatCard title="Vault entries" value={String(entries.length)} />
        <StatCard title="OTP verified" value={String(verifiedCount)} accent="green" />
        <StatCard title="PDF certificates" value={String(withCert)} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          load()
        }}
        className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 mt-6"
        style={{ maxWidth: 420, display: 'flex', gap: 8 }}
      >
        <input
          className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
          placeholder="Filter by farmer ID (optional)"
          value={farmerFilter}
          onChange={(e) => setFarmerFilter(e.target.value)}
        />
        <button type="submit" className="btn-secondary">
          Filter
        </button>
      </form>

      <div className="mt-6" style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)' }}>
        <DataTableShell title="Consent certificates">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ref</th>
                <th>Contract</th>
                <th>Farmer</th>
                <th>Buyer</th>
                <th>Verified</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6}>No consents in vault yet. They appear after buyer OTP verification.</td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.legalConsentId}>
                    <td>{e.certificateRef || `#{e.legalConsentId}`}</td>
                    <td>#{e.contractId}</td>
                    <td>#{e.farmerId || '—'}</td>
                    <td>{e.partyName || '—'}</td>
                    <td>{e.otpVerified ? String(e.verifiedAt || 'yes').slice(0, 19) : 'pending'}</td>
                    <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button type="button" className="btn-secondary" onClick={() => openDetail(e.legalConsentId)}>
                        History
                      </button>
                      <button type="button" className="btn-secondary" onClick={() => openPdf(e.consentDocumentUrl)}>
                        PDF
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </DataTableShell>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <h3 className="font-semibold">OTP verification history</h3>
          {!selected ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Select History on a consent to review the audit trail.</p>
          ) : (
            <>
              <p style={{ fontSize: 14, marginTop: 8 }}>
                <strong>{selected.certificateRef || `#${selected.legalConsentId}`}</strong>
                {' · '}
                {selected.consentType}
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Hash: {selected.certificateHash ? `${String(selected.certificateHash).slice(0, 24)}…` : '—'}
              </p>
              <p style={{ fontSize: 13, marginTop: 8 }}>{selected.consentText}</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <button type="button" className="btn-secondary" onClick={() => openPdf(selected.consentDocumentUrl)}>
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
              <ul style={{ marginTop: 16, paddingLeft: 18, fontSize: 13 }}>
                {history.length === 0 ? (
                  <li>No OTP events recorded.</li>
                ) : (
                  history.map((h) => (
                    <li key={h.eventId} style={{ marginBottom: 8 }}>
                      <strong>{h.eventType}</strong>
                      {' · '}
                      {String(h.createdAt || '').slice(0, 19)}
                      {h.detail ? ` — ${h.detail}` : ''}
                      {h.actorRole ? ` (${h.actorRole})` : ''}
                    </li>
                  ))
                )}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

export default ConsentVaultPage
