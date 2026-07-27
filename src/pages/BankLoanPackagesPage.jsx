import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import DataTableShell from '../components/ui/DataTableShell'
import {
  listBankLoanPackages,
  approveLoanPackage,
  rejectLoanPackage,
  disburseLoanPackage,
  exportLoanPackage,
  exportVerifiedFarmers,
} from '../services/bankabilityService'
import { isInsuranceRequiredError } from '../services/insuranceService'
import { exportLoanPackagePdf, exportVerifiedFarmersPdf } from '../utils/exportPdf'
import { formatRwf } from '../utils/currency'

/**
 * Bank portal inbox for Spec v2 loan packages: review, approve/reject, disburse, PDF.
 */
function BankLoanPackagesPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await listBankLoanPackages()
      setRows(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Failed to load loan packages')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const onApprove = async (id) => {
    setBusyId(id)
    try {
      await approveLoanPackage(id, 'Approved by bank officer')
      toast.success('Package approved — loan created (pending disbursement)')
      load()
    } catch (e) {
      if (isInsuranceRequiredError(e)) {
        toast.error(
          e?.response?.data?.error ||
            'Active insurance is required. An insurer must issue a policy before the bank can approve.',
        )
        return
      }
      toast.error(e?.response?.data?.error || 'Approve failed')
    } finally {
      setBusyId(null)
    }
  }

  const onReject = async (id) => {
    setBusyId(id)
    try {
      await rejectLoanPackage(id, 'Rejected by bank officer')
      toast.success('Package rejected')
      load()
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Reject failed')
    } finally {
      setBusyId(null)
    }
  }

  const onDisburse = async (id) => {
    setBusyId(id)
    try {
      await disburseLoanPackage(id)
      toast.success('Loan marked disbursed')
      load()
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Disburse failed')
    } finally {
      setBusyId(null)
    }
  }

  const onPdf = async (id) => {
    try {
      const full = await exportLoanPackage(id)
      exportLoanPackagePdf(full)
      toast.success('PDF downloaded')
    } catch {
      toast.error('PDF export failed')
    }
  }

  const onExportVerified = async () => {
    try {
      const data = await exportVerifiedFarmers()
      exportVerifiedFarmersPdf(data)
      toast.success(`Exported ${data.count || 0} verified farmers`)
    } catch {
      toast.error('Verified farmers export failed')
    }
  }

  const submitted = rows.filter((r) => String(r.status || '').startsWith('submitted')).length
  const approved = rows.filter((r) => r.status === 'approved').length
  const disbursed = rows.filter((r) => r.status === 'disbursed').length

  return (
    <section className="dashboard-page">
      <PageHeader
        breadcrumb="Bank › Loan packages"
        title="Loan application inbox"
        subtitle="Review Spec v2 packages, approve or reject, disburse funds, and download bank PDFs."
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={onExportVerified}>
              Export verified farmers
            </button>
            <button type="button" className="btn-primary" onClick={load} disabled={loading}>
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </>
        }
      />

      <div className="widgets four">
        <StatCard title="Inbox rows" value={String(rows.length)} />
        <StatCard title="Submitted" value={String(submitted)} />
        <StatCard title="Approved" value={String(approved)} />
        <StatCard title="Disbursed" value={String(disbursed)} />
      </div>

      <div className="mt-6">
        <DataTableShell title="Packages">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Farmer</th>
                <th>Amount</th>
                <th>Collateral</th>
                <th>Score</th>
                <th>Status</th>
                <th>Linked loan</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-cell">
                    No packages yet. Farmers submit from the mobile Suggest Loan flow.
                  </td>
                </tr>
              ) : (
                rows.map((p) => {
                  const status = String(p.status || '')
                  const canDecide = status.startsWith('submitted') || status === 'bank_selected'
                  const canDisburse = status === 'approved'
                  return (
                    <tr key={p.packageId}>
                      <td>#{p.packageId}</td>
                      <td>
                        <Link to={`/farmer/${p.farmerId}`}>#{p.farmerId}</Link>
                      </td>
                      <td>{formatRwf(p.suggestedAmount)}</td>
                      <td>{p.suggestedCollateralType || '—'}</td>
                      <td>{p.creditScoreSnapshot ?? '—'}</td>
                      <td>
                        <StatusBadge value={p.status} />
                      </td>
                      <td>{p.linkedLoanId ? `#${p.linkedLoanId}` : '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button type="button" className="btn-secondary" onClick={() => onPdf(p.packageId)}>
                            PDF
                          </button>
                          {canDecide ? (
                            <>
                              <button
                                type="button"
                                className="btn-primary"
                                disabled={busyId === p.packageId}
                                onClick={() => onApprove(p.packageId)}
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                className="btn-secondary"
                                disabled={busyId === p.packageId}
                                onClick={() => onReject(p.packageId)}
                              >
                                Reject
                              </button>
                            </>
                          ) : null}
                          {canDisburse ? (
                            <button
                              type="button"
                              className="btn-primary"
                              disabled={busyId === p.packageId}
                              onClick={() => onDisburse(p.packageId)}
                            >
                              Disburse
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </DataTableShell>
      </div>
    </section>
  )
}

export default BankLoanPackagesPage
