import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import DataTableShell from '../components/ui/DataTableShell'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import { usePortalCopy } from '../context/AuthLocaleContext'
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

const TAB_SPECS = [
  {
    id: 'loans',
    labelKey: 'tabLoans',
    columns: [
      { key: 'loanId', colKey: 'loanId' },
      { key: 'farmerId', colKey: 'farmerId' },
      { key: 'bankId', colKey: 'bankId' },
      { key: 'amount', colKey: 'amount', money: true },
      { key: 'status', colKey: 'status', badge: true },
      { key: 'disbursementDate', colKey: 'disbursementDate' },
    ],
  },
  {
    id: 'repayments',
    labelKey: 'tabRepayments',
    columns: [
      { key: 'repaymentId', colKey: 'repaymentId' },
      { key: 'loanId', colKey: 'loanIdRep' },
      { key: 'amountPaid', colKey: 'amountPaid', money: true },
      { key: 'paymentDate', colKey: 'paymentDate' },
    ],
  },
  {
    id: 'harvest',
    labelKey: 'tabHarvest',
    columns: [
      { key: 'yieldId', colKey: 'yieldId' },
      { key: 'farmId', colKey: 'farmId' },
      { key: 'season', colKey: 'season' },
      { key: 'year', colKey: 'year' },
      { key: 'quantity', colKey: 'quantity' },
      { key: 'verificationStatus', colKey: 'verificationStatus', badge: true },
    ],
  },
  {
    id: 'receipts',
    labelKey: 'tabReceipts',
    columns: [
      { key: 'receiptId', colKey: 'receiptId' },
      { key: 'farmerId', colKey: 'farmerId' },
      { key: 'cooperativeName', colKey: 'cooperativeName' },
      { key: 'commodity', colKey: 'commodity' },
      { key: 'status', colKey: 'status', badge: true },
      { key: 'expiryDate', colKey: 'expiryDate' },
    ],
  },
  {
    id: 'insurance',
    labelKey: 'tabInsurance',
    columns: [
      { key: 'policyId', colKey: 'policyId' },
      { key: 'farmerId', colKey: 'farmerId' },
      { key: 'policyType', colKey: 'policyType' },
      { key: 'status', colKey: 'status', badge: true },
      { key: 'validTo', colKey: 'validTo' },
      { key: 'complianceStatus', colKey: 'complianceStatus', badge: true },
    ],
  },
]

const ROW_KEYS = ['loanId', 'repaymentId', 'yieldId', 'receiptId', 'policyId']

/* eslint-disable react-hooks/set-state-in-effect -- initial report fetch on mount */
function AdminReportsPage() {
  const r = usePortalCopy().adminReports
  const cols = r.columns
  const [summary, setSummary] = useState(null)
  const [tab, setTab] = useState('loans')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const tabs = useMemo(
    () =>
      TAB_SPECS.map((spec) => ({
        ...spec,
        label: r[spec.labelKey],
        columns: spec.columns.map((c) => ({
          ...c,
          label: cols[c.colKey] || c.colKey,
        })),
      })),
    [r, cols],
  )

  const loadSummary = async () => {
    try {
      setSummary(await getAdminReportSummary())
    } catch {
      toast.error(r.loadSummaryFailed)
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
      toast.error(r.loadTabFailed)
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

  const activeTab = tabs.find((t) => t.id === tab) || tabs[0]
  const columns = activeTab.columns
  const isAdmin = getCurrentUser()?.role === 'ADMIN'

  return (
    <section className="dashboard-page dashboard-page--compact">
      <PageHeader
        title={r.title}
        subtitle={r.subtitle}
        actions={
          <>
            {isAdmin ? (
              <Link to="/admin" className="btn-secondary">
                {r.users}
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
              {loading ? r.refreshing : r.refresh}
            </button>
          </>
        }
      />

      <div className="widgets four">
        <StatCard
          title={r.loansIssued}
          value={String(summary?.loansIssued ?? 0)}
          meta={formatRwf(summary?.loanVolume ?? 0)}
        />
        <StatCard
          title={r.repayments}
          value={String(summary?.repaymentCount ?? 0)}
          meta={formatRwf(summary?.repaymentVolume ?? 0)}
        />
        <StatCard
          title={r.harvestVerified}
          value={String(summary?.harvestVerified ?? 0)}
          meta={r.harvestMeta(summary?.harvestVerified ?? 0, summary?.harvestRecords ?? 0)}
        />
        <StatCard
          title={r.insuranceActive}
          value={String(summary?.insuranceActive ?? 0)}
          meta={r.insuranceMeta(summary?.insuranceExpired ?? 0)}
        />
      </div>

      <div className="report-tabs" role="tablist" aria-label={r.tabListLabel}>
        {tabs.map((t) => (
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

      <DataTableShell title={activeTab.label} footer={<span>{r.tableFooter(rows.length)}</span>}>
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
                <td colSpan={columns.length}>{r.loading}</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="empty-cell">
                  {r.empty}
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
