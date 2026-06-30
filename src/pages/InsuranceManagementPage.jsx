import { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { toast } from 'react-toastify'
import DataTableShell from '../components/ui/DataTableShell'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import { getPolicies, updatePolicyStatus } from '../services/insuranceService'
import { formatRwf, formatRwfCompact } from '../utils/currency'
import { exportTableReport, slugifyFilename } from '../utils/exportPdf'

function InsuranceManagementPage() {
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyPolicyId, setBusyPolicyId] = useState(null)

  const loadPolicies = async () => {
    try {
      setLoading(true)
      const data = await getPolicies()
      setPolicies(data)
    } catch {
      toast.error('Failed to load insurance policies from backend.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPolicies()
  }, [])

  const claimRequests = useMemo(
    () =>
      policies.filter((policy) => ['CLAIMED', 'EXPIRED'].includes((policy.status || '').toUpperCase())),
    [policies],
  )
  const activePolicies = useMemo(
    () => policies.filter((policy) => (policy.status || '').toUpperCase() === 'ACTIVE'),
    [policies],
  )
  const totalPremiumValue = useMemo(
    () => policies.reduce((sum, policy) => sum + Number(policy.premium || 0), 0),
    [policies],
  )
  const settlementRatio = useMemo(() => {
    if (!policies.length) return '0.0%'
    const claimedCount = policies.filter((policy) => (policy.status || '').toUpperCase() === 'CLAIMED').length
    return `${((claimedCount / policies.length) * 100).toFixed(1)}%`
  }, [policies])

  const handleClaimAction = async (policyId, nextStatus) => {
    setBusyPolicyId(policyId)
    try {
      await updatePolicyStatus(policyId, nextStatus)
      await loadPolicies()
      toast.success(`Policy ${policyId} updated to ${nextStatus}.`)
    } catch {
      toast.error('Could not update policy status.')
    } finally {
      setBusyPolicyId(null)
    }
  }

  const handleExportReport = () => {
    const headers = [
      { key: 'id', label: 'Policy ID' },
      { key: 'farmer', label: 'Farmer' },
      { key: 'policyType', label: 'Policy type' },
      { key: 'premium', label: 'Premium (Rwf)' },
      { key: 'status', label: 'Status' },
      { key: 'insurerId', label: 'Insurer ID' },
    ]
    const rows = policies.map((policy) => ({
      id: policy.id,
      farmer: policy.farmer,
      policyType: policy.policyType,
      premium: policy.premium,
      status: policy.status,
      insurerId: policy.insurerId ?? '',
    }))
    exportTableReport({
      title: 'Insurance Portfolio Report',
      subtitle: `${rows.length} polic${rows.length === 1 ? 'y' : 'ies'}`,
      filename: `${slugifyFilename('insurance-portfolio')}-report`,
      headers,
      rows,
    })
    toast.success(`Downloaded PDF with ${rows.length} polic${rows.length === 1 ? 'y' : 'ies'}.`)
  }

  return (
    <section className="dashboard-page">
      <PageHeader
        title="Insurance Portfolio"
        subtitle="Institutional risk overview and claim management for regional clusters."
        actions={
          <>
          <button type="button" className="btn-secondary" onClick={handleExportReport}>
            <Download size={16} aria-hidden />
            Export PDF
          </button>
          <button type="button" className="btn-primary">+ New Policy</button>
          </>
        }
      />

      <div className="widgets four">
        <StatCard title="Total Premium Value" value={formatRwfCompact(totalPremiumValue)} meta="Calculated from DB premiums" />
        <StatCard title="Settlement Ratio" value={settlementRatio} meta="Claimed policies / total policies" />
        <StatCard title="Active Policies" value={String(activePolicies.length)} meta="Live backend count" />
        <StatCard title="Risk Exposure" value={claimRequests.length > 0 ? 'Moderate' : 'Low'} meta="Based on policy status" />
      </div>

      <div className="dashboard-grid">
        <DataTableShell title="Active Policy Overview">
          <table className="desktop-table">
            <thead>
              <tr>
                <th>Farmer / Entity</th>
                <th>Policy Type</th>
                <th>Premium (Rwf)</th>
                <th>Insurer ID</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="empty-cell">Loading policies...</td>
                </tr>
              ) : policies.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-cell">No insurance policies found in database.</td>
                </tr>
              ) : policies.map((policy) => (
                <tr key={policy.id}>
                  <td>{policy.farmer}</td>
                  <td>{policy.policyType}</td>
                  <td>{formatRwf(policy.premium)}</td>
                  <td>{policy.insurerId ?? 'N/A'}</td>
                  <td><StatusBadge value={policy.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>

        <div className="right-stack">
          <article className="card">
            <div className="section-head">
              <h2>Urgent Claims</h2>
              <span className="badge-alert">{claimRequests.length} Requires Review</span>
            </div>
            {claimRequests.map((claim) => (
              <div className="claim-item" key={claim.id}>
                <strong>{claim.policyType}</strong>
                <p>{claim.farmer}</p>
                <small>Premium: {formatRwf(claim.premium)}</small>
                {(claim.status || '').toUpperCase() === 'CLAIMED' ? (
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={busyPolicyId === claim.id}
                    onClick={() => handleClaimAction(claim.id, 'EXPIRED')}
                  >
                    Mark Claim Resolved
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={busyPolicyId === claim.id}
                    onClick={() => handleClaimAction(claim.id, 'ACTIVE')}
                  >
                    Reopen Policy
                  </button>
                )}
              </div>
            ))}
          </article>

          <article className="card">
            <h2>Regional Risk Gauge</h2>
            <p className="muted">Moderate risk · 62%</p>
            <div className="risk-meter">
              <div />
            </div>
            <p className="muted">Frost Index: Safe · Precipitation Gap: Warning</p>
          </article>
        </div>
      </div>

      <article className="card neutral-strip">
        <h2>Regional Risk Hotspots</h2>
        <p>Interactive geographical view of policy distribution and active claim clusters.</p>
        <button type="button" className="btn-secondary">Launch Satellite View</button>
      </article>
    </section>
  )
}

export default InsuranceManagementPage
