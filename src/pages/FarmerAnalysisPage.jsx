import { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { toast } from 'react-toastify'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiClient } from '../api/client'
import DataTableShell from '../components/ui/DataTableShell'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import {
  getFarmerById,
  getFarmsByFarmerId,
  getLatestCreditScore,
  getLoansByFarmerId,
  getMobileMoneyByFarmerId,
  getPaymentMovementsByFarmerId,
  getTransactionsByFarmerId,
  getYieldHistoryForFarms,
} from '../services/farmerService'
import { formatRwf } from '../utils/currency'
import { exportFarmerAnalysisReport } from '../utils/exportPdf'
import { formatRwandaPhoneDisplay } from '../utils/rwandaPhone'

const PAGE_SIZE = 12

const DETAIL_TABS = [
  { id: 'farms', label: 'Farms' },
  { id: 'yield', label: 'Yield' },
  { id: 'loans', label: 'Loans' },
  { id: 'payments', label: 'Payments' },
  { id: 'ledger', label: 'Ledger' },
]

function FarmerAnalysisPage() {
  const { farmerId } = useParams()
  const navigate = useNavigate()
  const [farmer, setFarmer] = useState(null)
  const [farms, setFarms] = useState([])
  const [transactions, setTransactions] = useState([])
  const [paymentMovements, setPaymentMovements] = useState([])
  const [mobileMoneyTxns, setMobileMoneyTxns] = useState([])
  const [yieldRecords, setYieldRecords] = useState([])
  const [creditScore, setCreditScore] = useState(null)
  const [creditRiskLevel, setCreditRiskLevel] = useState(null)
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [activeTab, setActiveTab] = useState('farms')
  const [page, setPage] = useState(1)
  const [consentStatus, setConsentStatus] = useState({
    bank: null,
    transactions: null,
  })

  const toConsentBadge = (value) => {
    if (value === true) return { label: 'ON', className: 'status-success' }
    if (value === false) return { label: 'OFF', className: 'status-danger' }
    return { label: 'UNKNOWN', className: 'status-neutral' }
  }

  useEffect(() => {
    const load = async () => {
      const normalizedId = Number(farmerId)
      if (!normalizedId) return

      try {
        setLoading(true)
        setLoadError('')

        const farmerResult = await Promise.resolve(getFarmerById(normalizedId))
          .then((value) => ({ status: 'fulfilled', value }))
          .catch((reason) => ({ status: 'rejected', reason }))

        setConsentStatus({ bank: null, transactions: null })

        if (farmerResult.status !== 'fulfilled') {
          const status = farmerResult?.reason?.response?.status
          if (status === 404 || status === 403) {
            navigate('/farmer', { replace: true })
            setLoadError('Farmer data is unavailable. Consent may be OFF or profile is not accessible.')
          } else {
            setLoadError('Farmer profile is unavailable right now. Please try again.')
          }
          setFarmer(null)
          return
        }

        setFarmer(farmerResult.value)

        const [
          farmsResult,
          txnsResult,
          scoreResult,
          loansResult,
          paymentResult,
          momoResult,
          bankConsentResult,
          txConsentResult,
        ] = await Promise.allSettled([
          getFarmsByFarmerId(normalizedId),
          getTransactionsByFarmerId(normalizedId),
          getLatestCreditScore(normalizedId),
          getLoansByFarmerId(normalizedId),
          getPaymentMovementsByFarmerId(normalizedId),
          getMobileMoneyByFarmerId(normalizedId),
          apiClient.get('/consents/latest', { params: { farmerId: normalizedId, dataType: 'BANK' } }),
          apiClient.get('/consents/latest', { params: { farmerId: normalizedId, dataType: 'TRANSACTIONS' } }),
        ])

        setConsentStatus({
          bank: bankConsentResult.status === 'fulfilled' ? Boolean(bankConsentResult.value?.data?.granted) : null,
          transactions:
            txConsentResult.status === 'fulfilled' ? Boolean(txConsentResult.value?.data?.granted) : null,
        })

        if (farmsResult.status === 'fulfilled') {
          const farmList = farmsResult.value || []
          setFarms(farmList)
          const yields = await getYieldHistoryForFarms(farmList).catch(() => [])
          setYieldRecords(yields)
        } else {
          setFarms([])
          setYieldRecords([])
        }

        setTransactions(txnsResult.status === 'fulfilled' ? txnsResult.value || [] : [])
        setCreditScore(scoreResult.status === 'fulfilled' ? scoreResult.value?.score ?? null : null)
        setCreditRiskLevel(scoreResult.status === 'fulfilled' ? scoreResult.value?.riskLevel || null : null)
        setLoans(loansResult.status === 'fulfilled' ? loansResult.value || [] : [])
        setPaymentMovements(paymentResult.status === 'fulfilled' ? paymentResult.value || [] : [])
        setMobileMoneyTxns(momoResult.status === 'fulfilled' ? momoResult.value || [] : [])
      } catch {
        setLoadError('Failed to load farmer profile data.')
        toast.error('Failed to load farmer profile data.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [farmerId, navigate])

  const totalAcreage = useMemo(
    () => farms.reduce((sum, farm) => sum + Number(farm.acreage || 0), 0),
    [farms],
  )

  const cropCount = useMemo(
    () => new Set(farms.map((farm) => farm.cropType).filter(Boolean)).size,
    [farms],
  )

  const activityCount = mobileMoneyTxns.length + paymentMovements.length + transactions.length

  const activeLoan = useMemo(
    () =>
      loans.find((loan) =>
        ['APPROVED', 'DISBURSED', 'PENDING'].includes(String(loan.status || '').toUpperCase()),
      ),
    [loans],
  )

  const paymentRows = useMemo(() => {
    const momo = mobileMoneyTxns.map((txn) => ({
      id: `m-${txn.transactionId}`,
      sortDate: txn.createdAt || '',
      date: txn.createdAt?.replace('T', ' ').slice(0, 16) || '—',
      type: `${txn.provider || 'MoMo'} · ${txn.direction || txn.purpose || '—'}`,
      status: txn.status || '—',
      amount: formatRwf(txn.amount),
    }))
    const gateway = paymentMovements.map((pay) => ({
      id: `p-${pay.paymentId}`,
      sortDate: pay.createdAt || '',
      date: pay.createdAt?.replace('T', ' ').slice(0, 16) || '—',
      type: pay.paymentType?.replaceAll('_', ' ') || 'Payment',
      status: pay.status || '—',
      amount: formatRwf(pay.amount),
    }))
    return [...momo, ...gateway].sort((a, b) => String(b.sortDate).localeCompare(String(a.sortDate)))
  }, [mobileMoneyTxns, paymentMovements])

  const formatScore = (value) => (value == null ? '—' : String(value))

  const profileSubtitle = farmer
    ? [
        `ID ${farmer.farmerId}`,
        farmer.location,
        farmer.phone ? formatRwandaPhoneDisplay(farmer.phone) : null,
        farmer.email,
      ]
        .filter(Boolean)
        .join(' · ')
    : ''

  const tabCounts = {
    farms: farms.length,
    yield: yieldRecords.length,
    loans: loans.length,
    payments: paymentRows.length,
    ledger: transactions.length,
  }

  const visibleRows = useMemo(() => {
    switch (activeTab) {
      case 'farms':
        return { rows: farms, total: farms.length }
      case 'yield':
        return { rows: yieldRecords, total: yieldRecords.length }
      case 'loans':
        return { rows: loans, total: loans.length }
      case 'payments':
        return { rows: paymentRows, total: paymentRows.length }
      case 'ledger':
        return { rows: transactions, total: transactions.length }
      default:
        return { rows: [], total: 0 }
    }
  }, [activeTab, farms, yieldRecords, loans, paymentRows, transactions])

  const totalPages = Math.max(1, Math.ceil(visibleRows.total / PAGE_SIZE))
  const start = (page - 1) * PAGE_SIZE
  const pagedRows = visibleRows.rows.slice(start, start + PAGE_SIZE)

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    setPage(1)
  }

  if (loading) {
    return (
      <section className="dashboard-page">
        <PageHeader breadcrumb="Portal › Farmer Analysis" title="Loading profile…" />
        <div className="widgets four">
          {[1, 2, 3, 4].map((id) => (
            <article key={id} className="widget card dashboard-skeleton" />
          ))}
        </div>
      </section>
    )
  }

  if (!farmer) {
    const bankBadge = toConsentBadge(consentStatus.bank)
    const txBadge = toConsentBadge(consentStatus.transactions)
    return (
      <section className="dashboard-page">
        <PageHeader breadcrumb="Portal › Farmer Analysis" title="Profile unavailable" />
        <article className="card">
          <p>
            Bank{' '}
            <span className={`status-badge ${bankBadge.className}`}>{bankBadge.label}</span>
            {' · '}Transactions{' '}
            <span className={`status-badge ${txBadge.className}`}>{txBadge.label}</span>
          </p>
          <p className="muted">{loadError || 'No farmer data was returned for this profile.'}</p>
        </article>
      </section>
    )
  }

  const bankBadge = toConsentBadge(consentStatus.bank)
  const txBadge = toConsentBadge(consentStatus.transactions)

  const handleExportReport = () => {
    exportFarmerAnalysisReport({
      farmer,
      creditScore,
      creditRiskLevel,
      consentStatus,
      farms,
      yieldRecords,
      loans,
      paymentRows,
      transactions,
      formatAmount: formatRwf,
    })
    toast.success('Farmer report downloaded as PDF.')
  }

  return (
    <section className="dashboard-page farmer-analysis-page">
      <PageHeader
        breadcrumb={
          <>
            <Link to="/farmer">Farmer directory</Link>
            {' › '}
            {farmer.fullName}
          </>
        }
        subtitle={profileSubtitle}
        actions={
          <>
            <Link to="/farmer" className="btn-secondary">
              Back to directory
            </Link>
            <button type="button" className="btn-secondary" onClick={handleExportReport}>
              <Download size={16} aria-hidden />
              Export PDF
            </button>
            <Link to="/loans" className="btn-primary">
              Manage loans
            </Link>
          </>
        }
      />

      <article className="farmer-profile-hero card">
        <div className="farmer-profile-hero__main">
          <div className="farmer-profile-hero__avatar" aria-hidden>
            {(farmer.fullName || '?').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2>{farmer.fullName}</h2>
            <p className="farmer-profile-hero__meta">{profileSubtitle}</p>
          </div>
        </div>
        <div className="farmer-profile-hero__stats">
          <div>
            <small>Credit score</small>
            <strong>{formatScore(creditScore)}</strong>
          </div>
          <div>
            <small>Farms</small>
            <strong>{farms.length}</strong>
          </div>
          <div>
            <small>Total acreage</small>
            <strong>{totalAcreage} ac</strong>
          </div>
          <div>
            <small>Loans</small>
            <strong>{loans.length}</strong>
          </div>
        </div>
      </article>

      <p className="farmer-consent-line">
        Bank <span className={`status-badge ${bankBadge.className}`}>{bankBadge.label}</span>
        {' · '}Transactions <span className={`status-badge ${txBadge.className}`}>{txBadge.label}</span>
        {farmer.registrationDate ? (
          <span className="farmer-consent-line__meta">
            {' · '}Member since {String(farmer.registrationDate).slice(0, 10)}
          </span>
        ) : null}
      </p>

      <div className="widgets four">
        <StatCard
          title="Credit score"
          value={formatScore(creditScore)}
          meta={creditRiskLevel ? `Risk: ${creditRiskLevel}` : 'No score calculated yet'}
        />
        <StatCard
          title="Farms"
          value={String(farms.length)}
          meta={`${totalAcreage} acres · ${cropCount} crop types`}
        />
        <StatCard
          title="Activity"
          value={String(activityCount)}
          meta={`${mobileMoneyTxns.length} MoMo · ${transactions.length} ledger`}
        />
        <StatCard
          title="Loans"
          value={String(loans.length)}
          meta={activeLoan ? `Active: ${activeLoan.status}` : 'No active loan'}
        />
      </div>

      <DataTableShell
        title="Farmer records"
        filters={
          <div className="detail-tabs" role="tablist">
            {DETAIL_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`detail-tab${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => handleTabChange(tab.id)}
              >
                {tab.label}
                {tabCounts[tab.id] > 0 ? ` (${tabCounts[tab.id]})` : ''}
              </button>
            ))}
          </div>
        }
        footer={
          <>
            <span>
              Showing {visibleRows.total === 0 ? 0 : start + 1}–
              {Math.min(start + PAGE_SIZE, visibleRows.total)} of {visibleRows.total}
            </span>
            {visibleRows.total > PAGE_SIZE ? (
              <div className="page-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <span className="page-indicator">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            ) : null}
          </>
        }
      >
        <table className="desktop-table dashboard-table">
          {activeTab === 'farms' && (
            <>
              <thead>
                <tr>
                  <th>Farm</th>
                  <th>Crop</th>
                  <th>Acreage</th>
                  <th>Irrigation</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-cell">
                      No farms registered.
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((farm) => (
                    <tr key={farm.farmId}>
                      <td>{farm.name || `Farm #${farm.farmId}`}</td>
                      <td>{farm.cropType || '—'}</td>
                      <td>{farm.acreage != null ? `${farm.acreage} ac` : '—'}</td>
                      <td>{farm.irrigation ? 'Yes' : 'No'}</td>
                      <td>{farm.location || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </>
          )}

          {activeTab === 'yield' && (
            <>
              <thead>
                <tr>
                  <th>Season</th>
                  <th>Year</th>
                  <th>Crop</th>
                  <th>Farm</th>
                  <th>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-cell">
                      No yield records logged yet.
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((item) => (
                    <tr key={item.yieldId}>
                      <td>{item.season || '—'}</td>
                      <td>{item.year || '—'}</td>
                      <td>{item.cropType || '—'}</td>
                      <td>{item.farmName || `Farm #${item.farmId}`}</td>
                      <td>{item.quantity ?? '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </>
          )}

          {activeTab === 'loans' && (
            <>
              <thead>
                <tr>
                  <th>Loan ID</th>
                  <th>Purpose</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Interest</th>
                  <th>Applied</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-cell">
                      No loan records found.
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((loan) => (
                    <tr key={loan.loanId}>
                      <td>#{loan.loanId}</td>
                      <td>{loan.loanPurpose || 'General'}</td>
                      <td>
                        <StatusBadge value={loan.status || 'Unknown'} />
                      </td>
                      <td>{formatRwf(loan.amount)}</td>
                      <td>{loan.interestRate != null ? `${loan.interestRate}%` : '—'}</td>
                      <td>
                        {loan.createdAt?.slice(0, 10) || loan.applicationDate?.slice(0, 10) || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </>
          )}

          {activeTab === 'payments' && (
            <>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="empty-cell">
                      No payment or MoMo activity recorded.
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.date}</td>
                      <td>{row.type}</td>
                      <td>
                        <StatusBadge value={row.status} />
                      </td>
                      <td>{row.amount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </>
          )}

          {activeTab === 'ledger' && (
            <>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="empty-cell">
                      No ledger transactions found.
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((txn) => (
                    <tr key={txn.transactionId}>
                      <td>{txn.category || txn.description || 'Transaction'}</td>
                      <td>{txn.transactionDate?.slice(0, 10) || txn.createdAt?.slice(0, 10) || '—'}</td>
                      <td>{formatRwf(txn.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </>
          )}
        </table>
      </DataTableShell>
    </section>
  )
}

export default FarmerAnalysisPage
