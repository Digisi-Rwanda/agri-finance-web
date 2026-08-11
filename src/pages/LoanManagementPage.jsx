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
import { usePageCopy } from '../context/AuthLocaleContext'
import { getLoans, updateLoanStatus } from '../services/bankService'
import { isInsuranceRequiredError } from '../services/insuranceService'
import { formatRwf, formatRwfCompact } from '../utils/currency'
import { exportTableReport, slugifyFilename } from '../utils/exportPdf'

const PAGE_SIZE = 10

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

function LoanManagementPage() {
  const { s, p } = usePageCopy('loans')
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

  const statusOptions = useMemo(
    () => [
      { value: 'All', label: p.allStatus },
      { value: 'Pending', label: s.statuses.PENDING },
      { value: 'Approved', label: s.statuses.APPROVED },
      { value: 'Disbursed', label: s.statuses.DISBURSED },
      { value: 'Rejected', label: s.statuses.REJECTED },
      { value: 'Repaid', label: 'Repaid' },
    ],
    [p.allStatus, s.statuses],
  )

  const riskOptions = useMemo(
    () => [
      { value: 'All', label: p.allRisk },
      { value: 'HIGH', label: s.risk.high },
      { value: 'MEDIUM', label: s.risk.medium },
      { value: 'LOW', label: s.risk.low },
    ],
    [p.allRisk, s.risk],
  )

  const sortOptions = useMemo(
    () => [
      { value: 'pending-first', label: p.sortPendingFirst },
      { value: 'amount-desc', label: p.sortAmountDesc },
      { value: 'amount-asc', label: p.sortAmountAsc },
      { value: 'score-desc', label: p.sortScoreDesc },
      { value: 'score-asc', label: p.sortScoreAsc },
      { value: 'name', label: p.sortName },
    ],
    [p],
  )

  const riskLabel = (risk) => {
    if (risk === 'HIGH') return s.risk.high
    if (risk === 'MEDIUM') return s.risk.medium
    if (risk === 'LOW') return s.risk.low
    return 'Unknown'
  }

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
        setLoadError(p.loadFailed)
        setLoans([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [p.loadFailed])

  const refreshLoans = async (loanId, status, updated) => {
    try {
      const next = await getLoans()
      setLoans(next)
    } catch {
      setLoans((prev) =>
        prev.map((loan) => (loan.id === loanId ? { ...loan, ...updated, status } : loan)),
      )
    }
    if (statusFilter !== 'All' && statusFilter !== status) {
      setStatusFilter('All')
      setPage(1)
    }
  }

  const handleStatus = async (loanId, status) => {
    const loan = loans.find((row) => row.id === loanId)
    setBusyId(loanId)
    try {
      const updated = await updateLoanStatus(loanId, status)
      await refreshLoans(loanId, status, updated)
      toast.success(p.statusUpdated(updated?.farmer || loan?.farmer || 'Loan', status.toLowerCase()))
    } catch (e) {
      if (status === 'Approved' && isInsuranceRequiredError(e)) {
        toast.error(e?.response?.data?.error || p.insuranceRequired)
        return
      }
      const apiError = e?.response?.data?.error || e?.response?.data?.message || e?.message
      toast.error(apiError || p.statusFailed(status.toLowerCase()))
    } finally {
      setBusyId(null)
    }
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
    const normalized = String(status || '').toLowerCase()
    return normalized === 'pending' || normalized === 'approved'
  }

  const renderLoanActions = (loan) => {
    if (!canDecide(loan.status)) {
      return loan.farmerId ? (
        <Link to={`/farmer/${loan.farmerId}`} className="btn-view">
          {p.viewFarmer}
          <ChevronRight size={14} aria-hidden />
        </Link>
      ) : (
        <span className="muted">{s.noAction}</span>
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
            {busy ? s.saving : s.disburse}
          </button>
          {loan.farmerId ? (
            <Link to={`/farmer/${loan.farmerId}`} className="btn-view">
              {s.profile}
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
          onClick={() => handleStatus(loan.id, 'Approved')}
        >
          {busy ? s.saving : s.approve}
        </button>
        <button
          type="button"
          className="btn-secondary danger"
          disabled={busy}
          onClick={() => handleStatus(loan.id, 'Rejected')}
        >
          {s.reject}
        </button>
        {loan.farmerId ? (
          <Link to={`/farmer/${loan.farmerId}`} className="btn-view">
            {s.profile}
          </Link>
        ) : null}
      </>
    )
  }

  const handleExportReport = () => {
    const headers = [
      { key: 'id', label: 'Loan ID' },
      { key: 'farmer', label: p.colFarmer },
      { key: 'score', label: p.colScore },
      { key: 'amount', label: p.colAmount },
      { key: 'risk', label: p.colRisk },
      { key: 'purpose', label: p.colPurpose },
      { key: 'status', label: p.colStatus },
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
      title: p.tableTitle,
      subtitle: `${rows.length} application(s)`,
      filename: `${slugifyFilename('loan-applications')}-report`,
      headers,
      rows,
    })
    toast.success(p.pdfDownloaded)
  }

  const footerFrom = filteredLoans.length === 0 ? 0 : start + 1
  const footerTo = Math.min(start + PAGE_SIZE, filteredLoans.length)

  return (
    <section className="dashboard-page dashboard-page--compact loan-directory-page">
      <PageHeader
        title={p.title}
        subtitle={p.subtitle}
        actions={
          <>
            <Link to="/farmer" className="btn-secondary">
              <Users size={16} />
              {p.farmers}
            </Link>
            <button type="button" className="btn-secondary" onClick={handleExportReport}>
              <Download size={16} aria-hidden />
              {p.exportPdf}
            </button>
            <Link to="/" className="btn-primary">
              {p.dashboard}
              <ArrowRight size={16} />
            </Link>
          </>
        }
      />

      {!loading ? (
        <div className="dash-alerts">
          <div className="dash-alert dash-alert--warn">
            <AlertCircle size={18} />
            <span>{p.insuranceGate}</span>
          </div>
        </div>
      ) : null}

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
                {p.pendingAlert(pendingCount)} · {formatRwfCompact(pendingAmount)}
              </span>
              <span className="dash-alert__action">{p.filterPending}</span>
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
              <span>{p.highRiskPending(highRiskPending)}</span>
              <span className="dash-alert__action">{p.reviewNow}</span>
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="widgets four">
        <StatCard
          title={p.applications}
          value={loading ? '…' : String(loans.length)}
          meta="All statuses"
        />
        <StatCard
          title={p.pending}
          value={loading ? '…' : String(pendingCount)}
          meta={formatRwfCompact(pendingAmount)}
          accent="amber"
        />
        <StatCard
          title={p.approved}
          value={loading ? '…' : String(approvedCount + disbursedCount)}
          meta={`${disbursedCount} ${String(s.statuses.DISBURSED).toLowerCase()}`}
          accent="blue"
        />
        <StatCard
          title={p.bookedAmount}
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
        title={p.tableTitle}
        filters={
          <div className="loan-filters">
            <label className="filter-search loan-filters__search">
              <span>{s.search}</span>
              <div className="filter-search__field">
                <Search size={14} aria-hidden />
                <input
                  type="search"
                  placeholder={p.searchPlaceholder}
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value)
                    setPage(1)
                  }}
                />
              </div>
            </label>

            <div className="loan-filters__chips" role="group" aria-label="Status filter">
              {statusOptions.map((option) => (
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
                {p.colRisk}
                <select
                  value={riskFilter}
                  onChange={(event) => {
                    setRiskFilter(event.target.value)
                    setPage(1)
                  }}
                >
                  {riskOptions.map((option) => (
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
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              {hasActiveFilters ? (
                <button type="button" className="btn-secondary loan-filters__clear" onClick={clearFilters}>
                  <X size={14} />
                  {s.clearFilters}
                </button>
              ) : null}
            </div>
          </div>
        }
        footer={
          <>
            <span>
              {s.showing(footerFrom, footerTo, filteredLoans.length)}
              {filteredLoans.length !== loans.length ? ` (filtered from ${loans.length})` : ''}
            </span>
            <div className="page-actions">
              <button
                type="button"
                className="btn-secondary"
                disabled={safePage === 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                {s.previous}
              </button>
              <span className="page-indicator">{s.pageOf(safePage, totalPages)}</span>
              <button
                type="button"
                className="btn-secondary"
                disabled={safePage === totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              >
                {s.next}
              </button>
            </div>
          </>
        }
      >
        <table className="desktop-table dashboard-table loan-directory-table">
          <thead>
            <tr>
              <th>{p.colFarmer}</th>
              <th>{p.colAmount}</th>
              <th>{p.colScore}</th>
              <th>{p.colRisk}</th>
              <th>{p.colPurpose}</th>
              <th>{p.colStatus}</th>
              <th>{p.colActions}</th>
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
                  {loans.length === 0 ? p.empty : p.emptyFilter}
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
                          Loan {loan.id} · Farmer #{loan.farmerId || '—'}
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
                    <td className="loan-purpose-cell">{loan.purpose || p.generalPurpose}</td>
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

        <div className="mobile-loan-list" aria-label={p.tableTitle}>
          {loading ? (
            <div className="skeleton-row" />
          ) : pagedLoans.length === 0 ? (
            <p className="empty-cell">{loans.length === 0 ? p.empty : p.emptyFilter}</p>
          ) : (
            pagedLoans.map((loan) => {
              const risk = normalizeRisk(loan)
              return (
                <article key={`mobile-${loan.id}`} className="loan-mobile-card">
                  <div className="loan-mobile-card__head">
                    <div>
                      <strong>{loan.farmer}</strong>
                      <small>
                        Loan {loan.id} · Farmer #{loan.farmerId || '—'}
                      </small>
                    </div>
                    <StatusBadge value={loan.status} />
                  </div>
                  <div className="loan-mobile-card__meta">
                    <div>
                      <span>{p.colAmount}</span>
                      {formatRwf(loan.amount)}
                    </div>
                    <div>
                      <span>{p.colScore}</span>
                      {loan.score || '—'}
                    </div>
                    <div>
                      <span>{p.colRisk}</span>
                      {riskLabel(risk)}
                    </div>
                    <div>
                      <span>{p.colPurpose}</span>
                      {loan.purpose || p.generalPurpose}
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
