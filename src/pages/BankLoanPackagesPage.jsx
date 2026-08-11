import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import DataTableShell from '../components/ui/DataTableShell'
import { usePageCopy } from '../context/AuthLocaleContext'
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
  const { s, p } = usePageCopy('loanPackages')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await listBankLoanPackages()
      setRows(Array.isArray(data) ? data : [])
    } catch {
      toast.error(s.toasts.loadFailed)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      toast.error(e?.response?.data?.error || s.toasts.updateFailed)
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
      toast.error(e?.response?.data?.error || s.toasts.updateFailed)
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
      toast.error(e?.response?.data?.error || s.toasts.updateFailed)
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
      toast.error(s.toasts.exportFailed)
    }
  }

  const onExportVerified = async () => {
    try {
      const data = await exportVerifiedFarmers()
      exportVerifiedFarmersPdf(data)
      toast.success(`Exported ${data.count || 0} verified farmers`)
    } catch {
      toast.error(s.toasts.exportFailed)
    }
  }

  const submitted = rows.filter((r) => String(r.status || '').startsWith('submitted')).length
  const approved = rows.filter((r) => r.status === 'approved').length
  const disbursed = rows.filter((r) => r.status === 'disbursed').length

  return (
    <section className="dashboard-page dashboard-page--compact">
      <PageHeader
        title={p.title}
        subtitle={p.subtitle}
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={onExportVerified}>
              {p.exportVerified}
            </button>
            <button type="button" className="btn-primary" onClick={load} disabled={loading}>
              {loading ? s.refreshing : s.refresh}
            </button>
          </>
        }
      />

      <div className="widgets four">
        <StatCard title={p.inbox} value={String(rows.length)} />
        <StatCard title={p.submitted} value={String(submitted)} />
        <StatCard title={p.approved} value={String(approved)} />
        <StatCard title={p.disbursed} value={String(disbursed)} />
      </div>

      <div className="mt-6">
        <DataTableShell title={p.tableTitle}>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>{p.colFarmer}</th>
                <th>{p.colAmount}</th>
                <th>{p.colCollateral}</th>
                <th>{p.colScore}</th>
                <th>{p.colStatus}</th>
                <th>{p.colLinkedLoan}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-cell">
                    {p.empty}
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const status = String(row.status || '')
                  const canDecide = status.startsWith('submitted') || status === 'bank_selected'
                  const canDisburse = status === 'approved'
                  return (
                    <tr key={row.packageId}>
                      <td>#{row.packageId}</td>
                      <td>
                        <Link to={`/farmer/${row.farmerId}`}>#{row.farmerId}</Link>
                      </td>
                      <td>{formatRwf(row.suggestedAmount)}</td>
                      <td>{row.suggestedCollateralType || '—'}</td>
                      <td>{row.creditScoreSnapshot ?? '—'}</td>
                      <td>
                        <StatusBadge value={row.status} />
                      </td>
                      <td>{row.linkedLoanId ? `#${row.linkedLoanId}` : '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button type="button" className="btn-secondary" onClick={() => onPdf(row.packageId)}>
                            {p.pdf}
                          </button>
                          {canDecide ? (
                            <>
                              <button
                                type="button"
                                className="btn-primary"
                                disabled={busyId === row.packageId}
                                onClick={() => onApprove(row.packageId)}
                              >
                                {s.approve}
                              </button>
                              <button
                                type="button"
                                className="btn-secondary"
                                disabled={busyId === row.packageId}
                                onClick={() => onReject(row.packageId)}
                              >
                                {s.reject}
                              </button>
                            </>
                          ) : null}
                          {canDisburse ? (
                            <button
                              type="button"
                              className="btn-primary"
                              disabled={busyId === row.packageId}
                              onClick={() => onDisburse(row.packageId)}
                            >
                              {s.disburse}
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
