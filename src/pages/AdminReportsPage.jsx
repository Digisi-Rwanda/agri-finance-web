import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import DataTableShell from '../components/ui/DataTableShell'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import { getCurrentUser } from '../services/auth'
import { formatRwf } from '../utils/currency'
import {
  getAdminReportHarvest,
  getAdminReportInsurance,
  getAdminReportLoans,
  getAdminReportReceipts,
  getAdminReportRepayments,
  getAdminReportSummary,
} from '../services/adminReportsService'

const TABS = [
  {
    id: 'loans',
    label: 'Loans issued',
    columns: [
      { key: 'loanId', label: 'Loan' },
      { key: 'farmerId', label: 'Farmer' },
      { key: 'bankId', label: 'Bank' },
      { key: 'amount', label: 'Amount', money: true },
      { key: 'status', label: 'Status', badge: true },
      { key: 'disbursementDate', label: 'Disbursed' },
    ],
  },
  {
    id: 'repayments',
    label: 'Repayments',
    columns: [
      { key: 'repaymentId', label: 'Repayment' },
      { key: 'loanId', label: 'Loan' },
      { key: 'amountPaid', label: 'Amount paid', money: true },
      { key: 'paymentDate', label: 'Paid on' },
    ],
  },
  {
    id: 'harvest',
    label: 'Harvest',
    columns: [
      { key: 'yieldId', label: 'Yield' },
      { key: 'farmId', label: 'Farm' },
      { key: 'season', label: 'Season' },
      { key: 'year', label: 'Year' },
      { key: 'quantity', label: 'Quantity' },
      { key: 'verificationStatus', label: 'Verification', badge: true },
    ],
  },
  {
    id: 'receipts',
    label: 'Warehouse receipts',
    columns: [
      { key: 'receiptId', label: 'Receipt' },
      { key: 'farmerId', label: 'Farmer' },
      { key: 'cooperativeName', label: 'Cooperative' },
      { key: 'commodity', label: 'Commodity' },
      { key: 'status', label: 'Status', badge: true },
      { key: 'expiryDate', label: 'Expires' },
    ],
  },
  {
    id: 'insurance',
    label: 'Insurance compliance',
    columns: [
      { key: 'policyId', label: 'Policy' },
      { key: 'farmerId', label: 'Farmer' },
      { key: 'policyType', label: 'Cover' },
      { key: 'status', label: 'Status', badge: true },
      { key: 'validTo', label: 'Valid to' },
      { key: 'complianceStatus', label: 'Compliance', badge: true },
    ],
  },
]

const ROW_KEYS = ['loanId', 'repaymentId', 'yieldId', 'receiptId', 'policyId']

/* Reports load once on mount, then per tab — same pattern as other role homes. */
/* eslint-disable react-hooks/set-state-in-effect -- initial report fetch on mount */
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
    void loadSummary()
    void loadTab('loans')
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time load on mount
  }, [])

  const onTab = (id) => {
    setTab(id)
    void loadTab(id)
  }

  const activeTab = TABS.find((t) => t.id === tab) || TABS[0]
  const columns = activeTab.columns
  const isAdmin = getCurrentUser()?.role === 'ADMIN'

  return (
    <section className="dashboard-page dashboard-page--compact">
      <PageHeader
        title="Reports"
        subtitle="Loans issued, repayments, harvest verification, warehouse receipts, and insurance compliance."
        actions={
          <>
            {isAdmin ? (
              <Link to="/admin" className="btn-secondary">
                Users
              </Link>
            ) : null}
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                void loadSummary()
                void loadTab(tab)
              }}
              disabled={loading}
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </>
        }
      />

      <div className="widgets four">
        <StatCard
          title="Loans issued"
          value={String(summary?.loansIssued ?? 0)}
          meta={formatRwf(summary?.loanVolume ?? 0)}
        />
        <StatCard
          title="Repayments"
          value={String(summary?.repaymentCount ?? 0)}
          meta={formatRwf(summary?.repaymentVolume ?? 0)}
        />
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

      <div className="report-tabs" role="tablist" aria-label="Report type">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? 'btn-primary' : 'btn-secondary'}
            onClick={() => onTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <DataTableShell
        title={activeTab.label}
        footer={<span>{rows.length} row(s)</span>}
      >
        <table className="data-table desktop-table dashboard-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key}>{c.label}</th>
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
                <tr key={ROW_KEYS.map((k) => row[k]).find(Boolean) || idx}>
                  {columns.map((c) => {
                    const value = row[c.key]
                    if (value == null || value === '') return <td key={c.key}>—</td>
                    if (c.badge) {
                      return (
                        <td key={c.key}>
                          <StatusBadge value={value} />
                        </td>
                      )
                    }
                    return <td key={c.key}>{c.money ? formatRwf(value) : String(value)}</td>
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </DataTableShell>
    </section>
  )
}

export default AdminReportsPage
