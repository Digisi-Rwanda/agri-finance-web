import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  Download,
  HandCoins,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react'
import { toast } from 'react-toastify'
import { Link, useParams } from 'react-router-dom'
import { apiClient } from '../api/client'
import DataTableShell from '../components/ui/DataTableShell'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import {
  getFarmerById,
  getFarmsByFarmerId,
  getInsurancePoliciesByFarmerId,
  getLatestCreditScore,
  getLoansByFarmerId,
  getMobileMoneyByFarmerId,
  getPaymentMovementsByFarmerId,
  getTransactionsByFarmerId,
  getYieldHistoryForFarms,
} from '../services/farmerService'
import { formatRwf, formatRwfCompact } from '../utils/currency'
import { exportFarmerAnalysisReport } from '../utils/exportPdf'
import { formatRwandaPhoneDisplay } from '../utils/rwandaPhone'

const PAGE_SIZE = 10

const DETAIL_TABS = [
  { id: 'farms', label: 'Farms' },
  { id: 'yield', label: 'Yield' },
  { id: 'loans', label: 'Loans' },
  { id: 'insurance', label: 'Insurance' },
  { id: 'payments', label: 'Payments' },
  { id: 'ledger', label: 'Ledger' },
]

function normalizeRisk(risk) {
  const value = String(risk || '').trim().toUpperCase()
  if (value === 'HIGH' || value === 'MEDIUM' || value === 'LOW') return value
  return null
}

function formatRiskLabel(risk) {
  const value = normalizeRisk(risk)
  if (!value) return null
  return value.charAt(0) + value.slice(1).toLowerCase()
}

function formatLoanStatus(status) {
  if (!status) return 'Unknown'
  const lower = String(status).toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

function scoreTone(score) {
  if (score == null || Number.isNaN(Number(score))) return 'muted'
  const n = Number(score)
  if (n >= 70) return 'good'
  if (n >= 40) return 'mid'
  return 'low'
}

function formatAcreage(value) {
  const n = Number(value || 0)
  if (!n) return '0'
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

function formatDate(value) {
  if (!value) return '—'
  return String(value).replace('T', ' ').slice(0, 16)
}

function formatDateShort(value) {
  if (!value) return '—'
  return String(value).slice(0, 10)
}

function consentMeta(value) {
  if (value === true) {
    return { label: 'Granted', className: 'status-success', Icon: ShieldCheck }
  }
  if (value === false) {
    return { label: 'Not granted', className: 'status-danger', Icon: ShieldOff }
  }
  return { label: 'Unknown', className: 'status-neutral', Icon: ShieldOff }
}

function FarmerAnalysisPage() {
  const { farmerId } = useParams()
  const [farmer, setFarmer] = useState(null)
  const [farms, setFarms] = useState([])
  const [transactions, setTransactions] = useState([])
  const [paymentMovements, setPaymentMovements] = useState([])
  const [mobileMoneyTxns, setMobileMoneyTxns] = useState([])
  const [yieldRecords, setYieldRecords] = useState([])
  const [policies, setPolicies] = useState([])
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

  useEffect(() => {
    const load = async () => {
      const normalizedId = Number(farmerId)
      if (!normalizedId) {
        setLoadError('Invalid farmer ID.')
        setFarmer(null)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setLoadError('')
        setConsentStatus({ bank: null, transactions: null })

        let farmerValue
        try {
          farmerValue = await getFarmerById(normalizedId)
        } catch (error) {
          const status = error?.response?.status
          if (status === 404 || status === 403) {
            setLoadError('This farmer is unavailable. Bank consent may be off, or the profile was not found.')
            setFarmer(null)
            return
          }
          setLoadError('Farmer profile is unavailable right now. Please try again.')
          setFarmer(null)
          return
        }

        setFarmer(farmerValue)

        const [
          farmsResult,
          txnsResult,
          scoreResult,
          loansResult,
          paymentResult,
          momoResult,
          policiesResult,
          bankConsentResult,
          txConsentResult,
        ] = await Promise.allSettled([
          getFarmsByFarmerId(normalizedId),
          getTransactionsByFarmerId(normalizedId),
          getLatestCreditScore(normalizedId),
          getLoansByFarmerId(normalizedId),
          getPaymentMovementsByFarmerId(normalizedId),
          getMobileMoneyByFarmerId(normalizedId),
          getInsurancePoliciesByFarmerId(normalizedId),
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
        setPolicies(policiesResult.status === 'fulfilled' ? policiesResult.value || [] : [])
      } catch {
        setLoadError('Failed to load farmer profile data.')
        toast.error('Failed to load farmer profile data.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [farmerId])

  const totalAcreage = useMemo(
    () => farms.reduce((sum, farm) => sum + Number(farm.acreage || 0), 0),
    [farms],
  )

  const cropCount = useMemo(
    () => new Set(farms.map((farm) => farm.cropType).filter(Boolean)).size,
    [farms],
  )

  const activityCount = mobileMoneyTxns.length + paymentMovements.length + transactions.length

  const pendingLoan = useMemo(
    () => loans.find((loan) => String(loan.status || '').toUpperCase() === 'PENDING'),
    [loans],
  )

  const activeLoan = useMemo(
    () =>
      loans.find((loan) =>
        ['APPROVED', 'DISBURSED', 'PENDING'].includes(String(loan.status || '').toUpperCase()),
      ),
    [loans],
  )

  const loanBook = useMemo(
    () =>
      loans
        .filter((loan) =>
          ['APPROVED', 'DISBURSED'].includes(String(loan.status || '').toUpperCase()),
        )
        .reduce((sum, loan) => sum + Number(loan.amount || 0), 0),
    [loans],
  )

  const paymentRows = useMemo(() => {
    const momo = mobileMoneyTxns.map((txn) => ({
      id: `m-${txn.transactionId}`,
      sortDate: txn.createdAt || '',
      date: formatDate(txn.createdAt),
      type: `${txn.provider || 'MoMo'} · ${txn.direction || txn.purpose || '—'}`,
      status: txn.status || '—',
      amount: formatRwf(txn.amount),
    }))
    const gateway = paymentMovements.map((pay) => ({
      id: `p-${pay.paymentId}`,
      sortDate: pay.createdAt || '',
      date: formatDate(pay.createdAt),
      type: pay.paymentType?.replaceAll('_', ' ') || 'Payment',
      status: pay.status || '—',
      amount: formatRwf(pay.amount),
    }))
    return [...momo, ...gateway].sort((a, b) => String(b.sortDate).localeCompare(String(a.sortDate)))
  }, [mobileMoneyTxns, paymentMovements])

  const risk = normalizeRisk(creditRiskLevel)
  const riskLabel = formatRiskLabel(creditRiskLevel)
  const bankConsent = consentMeta(consentStatus.bank)
  const txConsent = consentMeta(consentStatus.transactions)
  const BankConsentIcon = bankConsent.Icon
  const TxConsentIcon = txConsent.Icon

  const tabCounts = {
    farms: farms.length,
    yield: yieldRecords.length,
    loans: loans.length,
    insurance: policies.length,
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
      case 'insurance':
        return { rows: policies, total: policies.length }
      case 'payments':
        return { rows: paymentRows, total: paymentRows.length }
      case 'ledger':
        return { rows: transactions, total: transactions.length }
      default:
        return { rows: [], total: 0 }
    }
  }, [activeTab, farms, yieldRecords, loans, policies, paymentRows, transactions])

  const totalPages = Math.max(1, Math.ceil(visibleRows.total / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * PAGE_SIZE
  const pagedRows = visibleRows.rows.slice(start, start + PAGE_SIZE)

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    setPage(1)
  }

  const handleExportReport = () => {
    if (!farmer) return
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

  if (loading) {
    return (
      <section className="dashboard-page farmer-profile-page">
        <PageHeader
          breadcrumb={<Link to="/farmer">Farmers</Link>}
          title="Loading profile…"
          subtitle="Fetching farms, credit, loans, and activity."
        />
        <div className="widgets four">
          {[1, 2, 3, 4].map((id) => (
            <article key={id} className="widget card dashboard-skeleton" />
          ))}
        </div>
      </section>
    )
  }

  if (!farmer) {
    return (
      <section className="dashboard-page farmer-profile-page">
        <PageHeader
          breadcrumb={<Link to="/farmer">Farmers</Link>}
          title="Profile unavailable"
          actions={
            <Link to="/farmer" className="btn-primary">
              <ArrowLeft size={16} />
              Back to farmers
            </Link>
          }
        />
        <article className="card farmer-profile-empty">
          <p>{loadError || 'No farmer data was returned for this profile.'}</p>
          <div className="farmer-profile-empty__consents">
            <span>
              Bank <span className={`status-badge ${bankConsent.className}`}>{bankConsent.label}</span>
            </span>
            <span>
              Transactions <span className={`status-badge ${txConsent.className}`}>{txConsent.label}</span>
            </span>
          </div>
        </article>
      </section>
    )
  }

  return (
    <section className="dashboard-page dashboard-page--compact farmer-profile-page">
      <PageHeader
        breadcrumb={
          <>
            <Link to="/farmer">Farmers</Link>
            {' › '}
            Profile
          </>
        }
        title={farmer.fullName}
        subtitle="Credit, farms, loans, and payment activity for lending review."
        actions={
          <>
            <Link to="/farmer" className="btn-secondary">
              <ArrowLeft size={16} />
              Directory
            </Link>
            <button type="button" className="btn-secondary" onClick={handleExportReport}>
              <Download size={16} aria-hidden />
              Export PDF
            </button>
            <Link to="/loans" className="btn-primary">
              Loans
            </Link>
          </>
        }
      />

      {(risk === 'HIGH' || pendingLoan) && (
        <div className="dash-alerts">
          {risk === 'HIGH' ? (
            <div className="dash-alert dash-alert--risk">
              <AlertCircle size={18} />
              <span>
                <strong>High credit risk</strong> — score {creditScore ?? '—'} · review carefully before approving credit
              </span>
            </div>
          ) : null}
          {pendingLoan ? (
            <Link
              to="/loans"
              state={{ search: farmer.fullName }}
              className="dash-alert dash-alert--warn"
            >
              <HandCoins size={18} />
              <span>
                <strong>Pending loan</strong> · {formatRwf(pendingLoan.amount)} ·{' '}
                {pendingLoan.loanPurpose || 'General'}
              </span>
              <span className="dash-alert__action">Open loans</span>
            </Link>
          ) : null}
        </div>
      )}

      <article className="farmer-profile-hero card">
        <div className="farmer-profile-hero__main">
          <div className="farmer-profile-hero__avatar" aria-hidden>
            {(farmer.fullName || '?').slice(0, 2).toUpperCase()}
          </div>
          <div className="farmer-profile-hero__identity">
            <div className="farmer-profile-hero__title-row">
              <h2>{farmer.fullName}</h2>
              {riskLabel ? <StatusBadge value={risk} /> : null}
            </div>
            <p className="farmer-profile-hero__id">Farmer ID {farmer.farmerId}</p>
            <ul className="farmer-profile-contact">
              {farmer.location ? (
                <li>
                  <MapPin size={14} aria-hidden />
                  <span>{farmer.location}</span>
                </li>
              ) : null}
              {farmer.phone ? (
                <li>
                  <Phone size={14} aria-hidden />
                  <a href={`tel:${farmer.phone}`}>{formatRwandaPhoneDisplay(farmer.phone)}</a>
                </li>
              ) : null}
              {farmer.email ? (
                <li>
                  <Mail size={14} aria-hidden />
                  <a href={`mailto:${farmer.email}`}>{farmer.email}</a>
                </li>
              ) : null}
            </ul>
          </div>
        </div>

        <div className="farmer-profile-hero__aside">
          <div className="farmer-profile-score">
            <small>Credit score</small>
            <strong className={`score-pill score-pill--${scoreTone(creditScore)} score-pill--lg`}>
              {creditScore ?? '—'}
            </strong>
            <span>{riskLabel ? `${riskLabel} risk` : 'No risk rating yet'}</span>
          </div>
          <div className="farmer-profile-consents">
            <div>
              <BankConsentIcon size={14} aria-hidden />
              <span>Bank</span>
              <span className={`status-badge ${bankConsent.className}`}>{bankConsent.label}</span>
            </div>
            <div>
              <TxConsentIcon size={14} aria-hidden />
              <span>Transactions</span>
              <span className={`status-badge ${txConsent.className}`}>{txConsent.label}</span>
            </div>
            {farmer.registrationDate ? (
              <p className="farmer-profile-member">
                Member since {formatDateShort(farmer.registrationDate)}
              </p>
            ) : null}
          </div>
        </div>
      </article>

      <div className="widgets four">
        <StatCard
          title="Farms"
          value={String(farms.length)}
          meta={`${formatAcreage(totalAcreage)} acres · ${cropCount} crop type${cropCount === 1 ? '' : 's'}`}
        />
        <StatCard
          title="Active loan"
          value={activeLoan ? formatRwfCompact(activeLoan.amount) : 'None'}
          meta={activeLoan ? formatLoanStatus(activeLoan.status) : 'No pending or open loan'}
          accent="amber"
        />
        <StatCard
          title="Booked credit"
          value={formatRwfCompact(loanBook)}
          meta={`${loans.length} application${loans.length === 1 ? '' : 's'} total`}
          accent="blue"
        />
        <StatCard
          title="Activity"
          value={String(activityCount)}
          meta={`${mobileMoneyTxns.length} MoMo · ${paymentMovements.length} payments · ${transactions.length} ledger`}
          accent="slate"
        />
      </div>

      <DataTableShell
        title="Farmer records"
        filters={
          <div className="detail-tabs" role="tablist" aria-label="Farmer record sections">
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
                <span className="detail-tab__count">{tabCounts[tab.id]}</span>
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
                  disabled={safePage === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <span className="page-indicator">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={safePage === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            ) : null}
          </>
        }
      >
        <table className="desktop-table dashboard-table farmer-profile-table">
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
                      No farms registered for this farmer.
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((farm) => (
                    <tr key={farm.farmId}>
                      <td>
                        <strong className="dash-name">{farm.name || `Farm #${farm.farmId}`}</strong>
                      </td>
                      <td>{farm.cropType || '—'}</td>
                      <td>{farm.acreage != null ? `${formatAcreage(farm.acreage)} ac` : '—'}</td>
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
                  <th>Loan</th>
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
                      No loan applications for this farmer.
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((loan) => (
                    <tr key={loan.loanId}>
                      <td>
                        <strong className="dash-name">#{loan.loanId}</strong>
                      </td>
                      <td>{loan.loanPurpose || 'General'}</td>
                      <td>
                        <StatusBadge value={formatLoanStatus(loan.status)} />
                      </td>
                      <td className="loan-amount-cell">{formatRwf(loan.amount)}</td>
                      <td>{loan.interestRate != null ? `${loan.interestRate}%` : '—'}</td>
                      <td>{formatDateShort(loan.createdAt || loan.applicationDate)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </>
          )}

          {activeTab === 'insurance' && (
            <>
              <thead>
                <tr>
                  <th>Policy</th>
                  <th>Crop / cover</th>
                  <th>Status</th>
                  <th>Premium</th>
                  <th>Coverage</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-cell">
                      No insurance policies on file.
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((policy) => (
                    <tr key={policy.policyId || policy.id}>
                      <td>
                        <strong className="dash-name">
                          #{policy.policyId || policy.id}
                        </strong>
                      </td>
                      <td>{policy.cropType || policy.coverageType || policy.productName || '—'}</td>
                      <td>
                        <StatusBadge value={formatLoanStatus(policy.status)} />
                      </td>
                      <td>{policy.premium != null ? formatRwf(policy.premium) : '—'}</td>
                      <td>
                        {policy.coverageAmount != null
                          ? formatRwf(policy.coverageAmount)
                          : policy.sumInsured != null
                            ? formatRwf(policy.sumInsured)
                            : '—'}
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
                      <td className="loan-amount-cell">{row.amount}</td>
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
                      {consentStatus.transactions === false
                        ? 'Ledger is hidden until transactions consent is granted.'
                        : 'No ledger transactions found.'}
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((txn) => (
                    <tr key={txn.transactionId}>
                      <td>{txn.category || txn.description || 'Transaction'}</td>
                      <td>{formatDateShort(txn.transactionDate || txn.createdAt)}</td>
                      <td className="loan-amount-cell">{formatRwf(txn.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </>
          )}
        </table>

        <div className="farmer-profile-mobile" aria-label="Farmer records">
          {pagedRows.length === 0 ? (
            <p className="empty-cell">
              {activeTab === 'ledger' && consentStatus.transactions === false
                ? 'Ledger is hidden until transactions consent is granted.'
                : 'No records in this section yet.'}
            </p>
          ) : (
            pagedRows.map((row) => {
              if (activeTab === 'farms') {
                return (
                  <article key={`m-farm-${row.farmId}`} className="farmer-mobile-card">
                    <div className="farmer-mobile-card__head">
                      <div>
                        <strong>{row.name || `Farm #${row.farmId}`}</strong>
                        <small>{row.cropType || 'No crop set'}</small>
                      </div>
                      <span className="status-badge status-neutral">
                        {row.irrigation ? 'Irrigated' : 'Rainfed'}
                      </span>
                    </div>
                    <div className="farmer-mobile-card__meta">
                      <div>
                        <span>Acreage</span>
                        {row.acreage != null ? `${formatAcreage(row.acreage)} ac` : '—'}
                      </div>
                      <div>
                        <span>Location</span>
                        {row.location || '—'}
                      </div>
                    </div>
                  </article>
                )
              }

              if (activeTab === 'yield') {
                return (
                  <article key={`m-yield-${row.yieldId}`} className="farmer-mobile-card">
                    <div className="farmer-mobile-card__head">
                      <div>
                        <strong>{row.season || 'Season'} {row.year || ''}</strong>
                        <small>{row.farmName || `Farm #${row.farmId}`}</small>
                      </div>
                    </div>
                    <div className="farmer-mobile-card__meta">
                      <div>
                        <span>Crop</span>
                        {row.cropType || '—'}
                      </div>
                      <div>
                        <span>Quantity</span>
                        {row.quantity ?? '—'}
                      </div>
                    </div>
                  </article>
                )
              }

              if (activeTab === 'loans') {
                return (
                  <article key={`m-loan-${row.loanId}`} className="farmer-mobile-card">
                    <div className="farmer-mobile-card__head">
                      <div>
                        <strong>Loan #{row.loanId}</strong>
                        <small>{row.loanPurpose || 'General'}</small>
                      </div>
                      <StatusBadge value={formatLoanStatus(row.status)} />
                    </div>
                    <div className="farmer-mobile-card__meta">
                      <div>
                        <span>Amount</span>
                        {formatRwf(row.amount)}
                      </div>
                      <div>
                        <span>Interest</span>
                        {row.interestRate != null ? `${row.interestRate}%` : '—'}
                      </div>
                      <div>
                        <span>Applied</span>
                        {formatDateShort(row.createdAt || row.applicationDate)}
                      </div>
                    </div>
                  </article>
                )
              }

              if (activeTab === 'insurance') {
                return (
                  <article key={`m-pol-${row.policyId || row.id}`} className="farmer-mobile-card">
                    <div className="farmer-mobile-card__head">
                      <div>
                        <strong>Policy #{row.policyId || row.id}</strong>
                        <small>{row.cropType || row.coverageType || row.productName || 'Cover'}</small>
                      </div>
                      <StatusBadge value={formatLoanStatus(row.status)} />
                    </div>
                    <div className="farmer-mobile-card__meta">
                      <div>
                        <span>Premium</span>
                        {row.premium != null ? formatRwf(row.premium) : '—'}
                      </div>
                      <div>
                        <span>Coverage</span>
                        {row.coverageAmount != null
                          ? formatRwf(row.coverageAmount)
                          : row.sumInsured != null
                            ? formatRwf(row.sumInsured)
                            : '—'}
                      </div>
                    </div>
                  </article>
                )
              }

              if (activeTab === 'payments') {
                return (
                  <article key={`m-pay-${row.id}`} className="farmer-mobile-card">
                    <div className="farmer-mobile-card__head">
                      <div>
                        <strong>{row.type}</strong>
                        <small>{row.date}</small>
                      </div>
                      <StatusBadge value={row.status} />
                    </div>
                    <div className="farmer-mobile-card__meta">
                      <div>
                        <span>Amount</span>
                        {row.amount}
                      </div>
                    </div>
                  </article>
                )
              }

              return (
                <article key={`m-txn-${row.transactionId}`} className="farmer-mobile-card">
                  <div className="farmer-mobile-card__head">
                    <div>
                      <strong>{row.category || row.description || 'Transaction'}</strong>
                      <small>{formatDateShort(row.transactionDate || row.createdAt)}</small>
                    </div>
                  </div>
                  <div className="farmer-mobile-card__meta">
                    <div>
                      <span>Amount</span>
                      {formatRwf(row.amount)}
                    </div>
                  </div>
                </article>
              )
            })
          )}
        </div>
      </DataTableShell>
    </section>
  )
}

export default FarmerAnalysisPage
