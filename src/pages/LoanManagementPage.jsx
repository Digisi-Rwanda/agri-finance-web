import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  ChevronRight,
  Download,
  HandCoins,
  Search,
  Users,
  X,
} from 'lucide-react'
import { toast } from 'react-toastify'
import { Link, useLocation } from 'react-router-dom'
import DataTableShell from '../components/ui/DataTableShell'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import { getLoans, updateLoanStatus } from '../services/bankService'
import {
  ensureActiveInsuranceForFarmer,
  isInsuranceRequiredError,
} from '../services/insuranceService'
import { formatRwf, formatRwfCompact } from '../utils/currency'
import { exportTableReport, slugifyFilename } from '../utils/exportPdf'

const PAGE_SIZE = 10

const STATUS_OPTIONS = [
  { value: 'All', label: 'All status' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Disbursed', label: 'Disbursed' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Repaid', label: 'Repaid' },
]

const RISK_OPTIONS = [
  { value: 'All', label: 'All risk' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
]

const SORT_OPTIONS = [
  { value: 'pending-first', label: 'Pending first' },
  { value: 'amount-desc', label: 'Amount · high to low' },
  { value: 'amount-asc', label: 'Amount · low to high' },
  { value: 'score-desc', label: 'Score · high to low' },
  { value: 'score-asc', label: 'Score · low to high' },
  { value: 'name', label: 'Farmer A–Z' },
]

function normalizeRisk(loan) {
  const fromApi = String(loan.riskLevel || '').trim().toUpperCase()
  if (fromApi === 'HIGH' || fromApi === 'MEDIUM' || fromApi === 'LOW') return fromApi

  const score = Number(loan.score || 0)
  if (!score) return 'UNKNOWN'
  if (score >= 70) return 'LOW'
  if (score >= 40) return 'MEDIUM'
  return 'HIGH'
}

function riskRank(risk) {
  if (risk === 'HIGH') return 0
  if (risk === 'MEDIUM') return 1
  if (risk === 'LOW') return 2
  return 3
}

function statusRank(status) {
  const value = String(status || '').toLowerCase()
  if (value === 'pending') return 0
  if (value === 'approved') return 1
  if (value === 'disbursed') return 2
  if (value === 'rejected') return 3
  if (value === 'repaid') return 4
  return 5
}

function scoreTone(score) {
  if (score == null || Number.isNaN(Number(score)) || Number(score) === 0) return 'muted'
  const n = Number(score)
  if (n >= 70) return 'good'
  if (n >= 40) return 'mid'
  return 'low'
}

function riskLabel(risk) {
  if (risk === 'HIGH') return 'High'
  if (risk === 'MEDIUM') return 'Medium'
  if (risk === 'LOW') return 'Low'
  return 'Unknown'
}

function LoanManagementPage() {
  const location = useLocation()
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [statusFilter, setStatusFilter] = useState('All')
  const [riskFilter, setRiskFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState(location.state?.search || '')
  const [sortBy, setSortBy] = useState('pending-first')
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (location.state?.search) {
      setSearchQuery(location.state.search)
      setPage(1)
    }
  }, [location.state?.search])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setLoadError('')
      try {
        const data = await getLoans()
        setLoans(Array.isArray(data) ? data : [])
      } catch {
        setLoadError('Could not load loan applications. Check your connection and try again.')
        setLoans([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const refreshLoans = async (loanId, status, updated) => {
    try {
      const next = await getLoans()
      setLoans(next)
    } catch {
      // Status change already succeeded — keep local row updated if refresh fails.
      setLoans((prev) =>
        prev.map((loan) =>
          loan.id === loanId
            ? {
                ...loan,
                ...updated,
                status,
                hasActiveInsurance:
                  status === 'Approved' ? true : loan.hasActiveInsurance,
              }
            : loan,
        ),
      )
    }
    if (statusFilter !== 'All' && statusFilter !== status) {
      setStatusFilter('All')
      setPage(1)
    }
  }

  const handleStatus = async (loanId, status, options = {}) => {
    const loan = loans.find((row) => row.id === loanId)
    const farmerId = options.farmerId ?? loan?.farmerId
    setBusyId(loanId)
    try {
      if (status === 'Approved' && farmerId) {
        const needsInsurance = options.ensureInsurance ?? !loan?.hasActiveInsurance
        if (needsInsurance) {
          await ensureActiveInsuranceForFarmer(farmerId)
        }
      }

      const updated = await updateLoanStatus(loanId, status)
      await refreshLoans(loanId, status, updated)
      toast.success(`${updated?.farmer || loan?.farmer || 'Loan'} ${status.toLowerCase()}.`)
    } catch (e) {
      // If approve failed for insurance after a race, issue policy once and retry.
      if (
        status === 'Approved' &&
        farmerId &&
        isInsuranceRequiredError(e) &&
        !options.retriedInsurance
      ) {
        try {
          await ensureActiveInsuranceForFarmer(farmerId)
          const updated = await updateLoanStatus(loanId, status)
          await refreshLoans(loanId, status, updated)
          toast.success(`${updated?.farmer || loan?.farmer || 'Loan'} approved.`)
          return
        } catch (retryError) {
          const apiError =
            retryError?.response?.data?.error ||
            retryError?.response?.data?.message ||
            retryError?.message
          toast.error(apiError || 'Failed to approve loan. Please retry.')
          return
        }
      }

      const apiError = e?.response?.data?.error || e?.response?.data?.message || e?.message
      toast.error(apiError || `Failed to ${status.toLowerCase()} loan. Please retry.`)
    } finally {
      setBusyId(null)
    }
  }

  const requestApprove = (loan) => {
    if (!loan.hasActiveInsurance) {
      const ok = window.confirm(
        `${loan.farmer} has no active insurance policy.\n\nIssue a 1-year crop policy and approve this loan?`,
      )
      if (!ok) return
    }
    handleStatus(loan.id, 'Approved', {
      farmerId: loan.farmerId,
      ensureInsurance: !loan.hasActiveInsurance,
    })
  }

  const filteredLoans = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    const list = loans.filter((loan) => {
      const risk = normalizeRisk(loan)
      const statusOk = statusFilter === 'All' || loan.status === statusFilter
      const riskOk = riskFilter === 'All' || risk === riskFilter
      const searchOk =
        !query ||
        loan.farmer?.toLowerCase().includes(query) ||
        String(loan.id).toLowerCase().includes(query) ||
        String(loan.farmerId || '').includes(query) ||
        loan.purpose?.toLowerCase().includes(query)

      return statusOk && riskOk && searchOk
    })

    return [...list].sort((a, b) => {
      if (sortBy === 'amount-desc') return Number(b.amount || 0) - Number(a.amount || 0)
      if (sortBy === 'amount-asc') return Number(a.amount || 0) - Number(b.amount || 0)
      if (sortBy === 'score-desc') return Number(b.score || 0) - Number(a.score || 0)
      if (sortBy === 'score-asc') return Number(a.score || 0) - Number(b.score || 0)
      if (sortBy === 'name') return String(a.farmer || '').localeCompare(String(b.farmer || ''))

      const statusDiff = statusRank(a.status) - statusRank(b.status)
      if (statusDiff !== 0) return statusDiff
      const riskDiff = riskRank(normalizeRisk(a)) - riskRank(normalizeRisk(b))
      if (riskDiff !== 0) return riskDiff
      return Number(b.amount || 0) - Number(a.amount || 0)
    })
  }, [loans, searchQuery, statusFilter, riskFilter, sortBy])

  const totalPages = Math.max(1, Math.ceil(filteredLoans.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * PAGE_SIZE
  const pagedLoans = filteredLoans.slice(start, start + PAGE_SIZE)

  const pendingCount = loans.filter((loan) => loan.status === 'Pending').length
  const approvedCount = loans.filter((loan) => loan.status === 'Approved').length
  const disbursedCount = loans.filter((loan) => loan.status === 'Disbursed').length
  const highRiskPending = loans.filter(
    (loan) => loan.status === 'Pending' && normalizeRisk(loan) === 'HIGH',
  ).length
  const pendingAmount = loans
    .filter((loan) => loan.status === 'Pending')
    .reduce((sum, loan) => sum + Number(loan.amount || 0), 0)
  const approvedAmount = loans
    .filter((loan) => loan.status === 'Approved' || loan.status === 'Disbursed')
    .reduce((sum, loan) => sum + Number(loan.amount || 0), 0)

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== 'All' ||
    riskFilter !== 'All' ||
    sortBy !== 'pending-first'

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('All')
    setRiskFilter('All')
    setSortBy('pending-first')
    setPage(1)
  }

  const canDecide = (status) => {
    const s = String(status || '').toLowerCase()
    return s === 'pending' || s === 'approved'
  }

  const renderLoanActions = (loan) => {
    if (!canDecide(loan.status)) {
      return loan.farmerId ? (
        <Link to={`/farmer/${loan.farmerId}`} className="btn-view">
          View farmer
          <ChevronRight size={14} aria-hidden />
        </Link>
      ) : (
        <span className="muted">No action</span>
      )
    }

    const busy = busyId === loan.id
    if (String(loan.status).toLowerCase() === 'approved') {
      return (
        <>
          <button
            type="button"
            className="btn-primary"
            disabled={busy}
            onClick={() => handleStatus(loan.id, 'Disbursed')}
          >
            {busy ? 'Saving…' : 'Disburse'}
          </button>
          {loan.farmerId ? (
            <Link to={`/farmer/${loan.farmerId}`} className="btn-view">
              Profile
            </Link>
          ) : null}
        </>
      )
    }
    return (
      <>
        <button
          type="button"
          className="btn-primary"
          disabled={busy}
          onClick={() => requestApprove(loan)}
          title={
            loan.hasActiveInsurance
              ? 'Approve loan'
              : 'Requires active insurance — will offer to issue a policy'
          }
        >
          {busy ? 'Saving…' : loan.hasActiveInsurance ? 'Approve' : 'Approve (+ insurance)'}
        </button>
        <button
          type="button"
          className="btn-secondary danger"
          disabled={busy}
          onClick={() => handleStatus(loan.id, 'Rejected')}
        >
          Reject
        </button>
        {loan.farmerId ? (
          <Link
            to={
              loan.hasActiveInsurance
                ? `/farmer/${loan.farmerId}`
                : `/insurance?farmerId=${loan.farmerId}`
            }
            className="btn-view"
          >
            {loan.hasActiveInsurance ? 'Profile' : 'Insurance'}
          </Link>
        ) : null}
      </>
    )
  }

  const handleExportReport = () => {
    const headers = [
      { key: 'id', label: 'Loan ID' },
      { key: 'farmer', label: 'Farmer' },
      { key: 'score', label: 'Credit score' },
      { key: 'amount', label: 'Amount (Rwf)' },
      { key: 'risk', label: 'Risk' },
      { key: 'purpose', label: 'Purpose' },
      { key: 'status', label: 'Status' },
    ]
    const rows = filteredLoans.map((loan) => ({
      id: loan.id,
      farmer: loan.farmer,
      score: loan.score || '—',
      amount: loan.amount,
      risk: riskLabel(normalizeRisk(loan)),
      purpose: loan.purpose,
      status: loan.status,
    }))
    exportTableReport({
      title: 'Loan Applications Report',
      subtitle: `${rows.length} application(s)`,
      filename: `${slugifyFilename('loan-applications')}-report`,
      headers,
      rows,
    })
    toast.success(`Downloaded PDF with ${rows.length} loan record(s).`)
  }

  return (
    <section className="dashboard-page dashboard-page--compact loan-directory-page">
      <PageHeader
        title="Loans"
        subtitle="Review applications, approve or reject, and track disbursed amounts."
        actions={
          <>
            <Link to="/farmer" className="btn-secondary">
              <Users size={16} />
              Farmers
            </Link>
            <button type="button" className="btn-secondary" onClick={handleExportReport}>
              <Download size={16} aria-hidden />
              Export PDF
            </button>
            <Link to="/" className="btn-primary">
              Dashboard
              <ArrowRight size={16} />
            </Link>
          </>
        }
      />

      {(pendingCount > 0 || highRiskPending > 0) && !loading ? (
        <div className="dash-alerts">
          {pendingCount > 0 ? (
            <button
              type="button"
              className="dash-alert dash-alert--warn"
              onClick={() => {
                setStatusFilter('Pending')
                setPage(1)
              }}
            >
              <HandCoins size={18} />
              <span>
                <strong>
                  {pendingCount} pending application{pendingCount === 1 ? '' : 's'}
                </strong>{' '}
                awaiting a decision · {formatRwfCompact(pendingAmount)}
              </span>
              <span className="dash-alert__action">Filter pending</span>
            </button>
          ) : null}
          {highRiskPending > 0 ? (
            <button
              type="button"
              className="dash-alert dash-alert--risk"
              onClick={() => {
                setStatusFilter('Pending')
                setRiskFilter('HIGH')
                setPage(1)
              }}
            >
              <AlertCircle size={18} />
              <span>
                <strong>
                  {highRiskPending} high-risk pending
                </strong>{' '}
                application{highRiskPending === 1 ? '' : 's'} need closer review
              </span>
              <span className="dash-alert__action">Review now</span>
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="widgets four">
        <StatCard title="Applications" value={loading ? '…' : String(loans.length)} meta="All statuses" />
        <StatCard
          title="Pending"
          value={loading ? '…' : String(pendingCount)}
          meta={formatRwfCompact(pendingAmount)}
          accent="amber"
        />
        <StatCard
          title="Approved"
          value={loading ? '…' : String(approvedCount + disbursedCount)}
          meta={`${disbursedCount} disbursed`}
          accent="blue"
        />
        <StatCard
          title="Booked amount"
          value={loading ? '…' : formatRwfCompact(approvedAmount)}
          meta="Approved + disbursed"
          accent="slate"
        />
      </div>

      {loadError ? (
        <article className="card farmer-directory-alert">
          <p>{loadError}</p>
        </article>
      ) : null}

      <DataTableShell
        title="Loan applications"
        filters={
          <div className="loan-filters">
            <label className="filter-search loan-filters__search">
              <span>Search</span>
              <div className="filter-search__field">
                <Search size={14} aria-hidden />
                <input
                  type="search"
                  placeholder="Farmer, loan ID, or purpose"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value)
                    setPage(1)
                  }}
                />
              </div>
            </label>

            <div className="loan-filters__chips" role="group" aria-label="Status filter">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`filter-chip${statusFilter === option.value ? ' filter-chip--active' : ''}`}
                  onClick={() => {
                    setStatusFilter(option.value)
                    setPage(1)
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="loan-filters__row">
              <label>
                Risk
                <select
                  value={riskFilter}
                  onChange={(event) => {
                    setRiskFilter(event.target.value)
                    setPage(1)
                  }}
                >
                  {RISK_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Sort by
                <select
                  value={sortBy}
                  onChange={(event) => {
                    setSortBy(event.target.value)
                    setPage(1)
                  }}
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              {hasActiveFilters ? (
                <button type="button" className="btn-secondary loan-filters__clear" onClick={clearFilters}>
                  <X size={14} />
                  Clear filters
                </button>
              ) : null}
            </div>
          </div>
        }
        footer={
          <>
            <span>
              Showing {filteredLoans.length === 0 ? 0 : start + 1}–
              {Math.min(start + PAGE_SIZE, filteredLoans.length)} of {filteredLoans.length}
              {filteredLoans.length !== loans.length ? ` (filtered from ${loans.length})` : ''}
            </span>
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
          </>
        }
      >
        <table className="desktop-table dashboard-table loan-directory-table">
          <thead>
            <tr>
              <th>Farmer</th>
              <th>Amount</th>
              <th>Score</th>
              <th>Risk</th>
              <th>Purpose</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(4)].map((_, index) => (
                <tr key={`sk-${index}`}>
                  <td colSpan={7}>
                    <div className="skeleton-row" />
                  </td>
                </tr>
              ))
            ) : pagedLoans.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-cell">
                  {loans.length === 0
                    ? 'No loan applications yet.'
                    : 'No loans match your search or filters.'}
                </td>
              </tr>
            ) : (
              pagedLoans.map((loan) => {
                const risk = normalizeRisk(loan)
                return (
                  <tr key={loan.id}>
                    <td>
                      <div className="farmer-cell">
                        <strong className="dash-name">{loan.farmer}</strong>
                        <small>
                          Loan {loan.id}
                          {String(loan.status).toLowerCase() === 'pending'
                            ? loan.hasActiveInsurance
                              ? ' · Insured'
                              : ' · No insurance'
                            : ''}
                        </small>
                      </div>
                    </td>
                    <td className="loan-amount-cell">{formatRwf(loan.amount)}</td>
                    <td>
                      <span className={`score-pill score-pill--${scoreTone(loan.score)}`}>
                        {loan.score || '—'}
                      </span>
                    </td>
                    <td>
                      <StatusBadge value={risk === 'UNKNOWN' ? 'Unknown' : risk} />
                    </td>
                    <td className="loan-purpose-cell">{loan.purpose || 'General'}</td>
                    <td>
                      <StatusBadge value={loan.status} />
                    </td>
                    <td className="action-cell">{renderLoanActions(loan)}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        <div className="mobile-loan-list" aria-label="Loan applications">
          {loading ? (
            <div className="skeleton-row" />
          ) : pagedLoans.length === 0 ? (
            <p className="empty-cell">
              {loans.length === 0
                ? 'No loan applications yet.'
                : 'No loans match your search or filters.'}
            </p>
          ) : (
            pagedLoans.map((loan) => {
              const risk = normalizeRisk(loan)
              return (
                <article key={`mobile-${loan.id}`} className="loan-mobile-card">
                  <div className="loan-mobile-card__head">
                    <div>
                      <strong>{loan.farmer}</strong>
                      <small>
                        Loan {loan.id}
                        {String(loan.status).toLowerCase() === 'pending'
                          ? loan.hasActiveInsurance
                            ? ' · Insured'
                            : ' · No insurance'
                          : ''}
                      </small>
                    </div>
                    <StatusBadge value={loan.status} />
                  </div>
                  <div className="loan-mobile-card__meta">
                    <div>
                      <span>Amount</span>
                      {formatRwf(loan.amount)}
                    </div>
                    <div>
                      <span>Score</span>
                      {loan.score || '—'}
                    </div>
                    <div>
                      <span>Risk</span>
                      {riskLabel(risk)}
                    </div>
                    <div>
                      <span>Purpose</span>
                      {loan.purpose || 'General'}
                    </div>
                  </div>
                  <div className="loan-mobile-card__actions">{renderLoanActions(loan)}</div>
                </article>
              )
            })
          )}
        </div>
      </DataTableShell>
    </section>
  )
}

export default LoanManagementPage
