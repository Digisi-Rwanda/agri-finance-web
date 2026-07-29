import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import DataTableShell from '../components/ui/DataTableShell'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import {
  getAdminReportHarvest,
  getAdminReportInsurance,
  getAdminReportLoans,
  getAdminReportReceipts,
  getAdminReportRepayments,
  getAdminReportSummary,
} from '../services/adminReportsService'

const TABS = [
  { id: 'loans', label: 'Loans issued' },
  { id: 'repayments', label: 'Repayments' },
  { id: 'harvest', label: 'Harvest' },
  { id: 'receipts', label: 'Warehouse receipts' },
  { id: 'insurance', label: 'Insurance compliance' },
]

function AdminReportsPage() {
  const [summary, setSummary] = useState(null)
  const [tab, setTab] = useState('loans')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const loadSummary = async () => {
    try {
      setSummary(await getAdminReportSummary())
    } catch {
      toast.error('Failed to load report summary')
    }
  }

  const loadTab = async (nextTab = tab) => {
    setLoading(true)
    try {
      let data = []
      if (nextTab === 'loans') data = await getAdminReportLoans()
      else if (nextTab === 'repayments') data = await getAdminReportRepayments()
      else if (nextTab === 'harvest') data = await getAdminReportHarvest()
      else if (nextTab === 'receipts') data = await getAdminReportReceipts()
      else if (nextTab === 'insurance') data = await getAdminReportInsurance()
      setRows(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Failed to load report')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSummary()
    loadTab('loans')
  }, [])

  const onTab = (id) => {
    setTab(id)
    loadTab(id)
  }

  const columns =
    tab === 'loans'
      ? ['loanId', 'farmerId', 'bankId', 'amount', 'status', 'disbursementDate']
      : tab === 'repayments'
        ? ['repaymentId', 'loanId', 'amountPaid', 'paymentDate']
        : tab === 'harvest'
          ? ['yieldId', 'farmId', 'season', 'year', 'quantity', 'verificationStatus']
          : tab === 'receipts'
            ? ['receiptId', 'farmerId', 'cooperativeName', 'commodity', 'status', 'expiryDate']
            : ['policyId', 'farmerId', 'policyType', 'status', 'validTo', 'complianceStatus']

  return (
    <section className="dashboard-page dashboard-page--compact">
      <PageHeader
        title="Admin reports"
        subtitle="Loans issued, repayments, harvest verification, warehouse receipts, and insurance compliance."
        actions={
          <>
            <Link to="/admin" className="btn-secondary">
              Users
            </Link>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                loadSummary()
                loadTab(tab)
              }}
              disabled={loading}
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </>
        }
      />

      <div className="widgets four">
        <StatCard title="Loans issued" value={String(summary?.loansIssued ?? 0)} meta={`Volume ${summary?.loanVolume ?? 0}`} />
        <StatCard title="Repayments" value={String(summary?.repaymentCount ?? 0)} meta={`Volume ${summary?.repaymentVolume ?? 0}`} />
        <StatCard
          title="Harvest verified"
          value={String(summary?.harvestVerified ?? 0)}
          meta={`of ${summary?.harvestRecords ?? 0} records`}
        />
        <StatCard
          title="Insurance active"
          value={String(summary?.insuranceActive ?? 0)}
          meta={`${summary?.insuranceExpired ?? 0} expired`}
        />
      </div>

      <div className="dash-section" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? 'btn-primary' : 'btn-secondary'}
            onClick={() => onTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <DataTableShell title={TABS.find((t) => t.id === tab)?.label || 'Report'} footer={<span>{rows.length} row(s)</span>}>
        <div className="table-scroll">
          <table className="data-table desktop-table dashboard-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length}>Loading…</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="empty-cell">
                    No records.
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={row.loanId || row.repaymentId || row.yieldId || row.receiptId || row.policyId || idx}>
                    {columns.map((c) => (
                      <td key={c}>{row[c] != null && row[c] !== '' ? String(row[c]) : '—'}</td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DataTableShell>
    </section>
  )
}

export default AdminReportsPage
