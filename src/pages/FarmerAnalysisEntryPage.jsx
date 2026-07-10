import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  ChevronRight,
  HandCoins,
  Search,
  X,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import DataTableShell from '../components/ui/DataTableShell'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import { getFarmersWithInsights } from '../services/farmerService'
import { formatRwandaPhoneDisplay } from '../utils/rwandaPhone'

const PAGE_SIZE = 12

const RISK_OPTIONS = [
  { value: 'All', label: 'All risk' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
  { value: 'UNKNOWN', label: 'Unknown' },
]

const LOAN_OPTIONS = [
  { value: 'All', label: 'All loans' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'DISBURSED', label: 'Disbursed' },
  { value: 'NONE', label: 'No active loan' },
]

const SORT_OPTIONS = [
  { value: 'name', label: 'Name A–Z' },
  { value: 'score-desc', label: 'Score · high to low' },
  { value: 'score-asc', label: 'Score · low to high' },
  { value: 'risk', label: 'Risk · high first' },
]

function formatLoanStatus(status) {
  if (!status) return 'None'
  const lower = String(status).toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

function normalizeRisk(risk) {
  const value = String(risk || '').trim().toUpperCase()
  if (value === 'HIGH' || value === 'MEDIUM' || value === 'LOW') return value
  return 'UNKNOWN'
}

function riskRank(risk) {
  const value = normalizeRisk(risk)
  if (value === 'HIGH') return 0
  if (value === 'MEDIUM') return 1
  if (value === 'LOW') return 2
  return 3
}

function scoreTone(score) {
  if (score == null || Number.isNaN(Number(score))) return 'muted'
  const n = Number(score)
  if (n >= 70) return 'good'
  if (n >= 40) return 'mid'
  return 'low'
}

export default function FarmerAnalysisEntryPage() {
  const location = useLocation()
  const [farmers, setFarmers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [searchQuery, setSearchQuery] = useState(location.state?.search || '')
  const [riskFilter, setRiskFilter] = useState('All')
  const [loanFilter, setLoanFilter] = useState('All')
  const [scoreFilter, setScoreFilter] = useState('')
  const [sortBy, setSortBy] = useState('risk')
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
        const data = await getFarmersWithInsights()
        setFarmers(Array.isArray(data) ? data : [])
      } catch {
        setLoadError('Could not load farmer profiles. Check your connection and try again.')
        setFarmers([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filteredFarmers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const minScore = scoreFilter === '' ? null : Number(scoreFilter)

    const list = farmers.filter((farmer) => {
      const score = Number(farmer.latestCreditScore ?? farmer.creditScore)
      const risk = normalizeRisk(farmer.riskLevel)
      const loan = String(farmer.activeLoan || '').toUpperCase() || 'NONE'

      const scoreOk =
        minScore == null || Number.isNaN(minScore)
          ? true
          : farmer.latestCreditScore != null && score >= minScore
      const riskOk = riskFilter === 'All' ? true : risk === riskFilter
      const loanOk =
        loanFilter === 'All'
          ? true
          : loanFilter === 'NONE'
            ? !farmer.activeLoan
            : loan === loanFilter
      const searchOk =
        !query ||
        farmer.fullName?.toLowerCase().includes(query) ||
        String(farmer.farmerId).includes(query) ||
        farmer.phone?.includes(query) ||
        farmer.email?.toLowerCase().includes(query) ||
        farmer.location?.toLowerCase().includes(query)

      return scoreOk && riskOk && loanOk && searchOk
    })

    return [...list].sort((a, b) => {
      if (sortBy === 'name') {
        return String(a.fullName || '').localeCompare(String(b.fullName || ''))
      }
      if (sortBy === 'score-desc') {
        return Number(b.latestCreditScore ?? -1) - Number(a.latestCreditScore ?? -1)
      }
      if (sortBy === 'score-asc') {
        const aScore = a.latestCreditScore == null ? Number.POSITIVE_INFINITY : Number(a.latestCreditScore)
        const bScore = b.latestCreditScore == null ? Number.POSITIVE_INFINITY : Number(b.latestCreditScore)
        return aScore - bScore
      }
      const riskDiff = riskRank(a.riskLevel) - riskRank(b.riskLevel)
      if (riskDiff !== 0) return riskDiff
      return String(a.fullName || '').localeCompare(String(b.fullName || ''))
    })
  }, [farmers, searchQuery, riskFilter, loanFilter, scoreFilter, sortBy])

  const totalPages = Math.max(1, Math.ceil(filteredFarmers.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * PAGE_SIZE
  const pagedFarmers = filteredFarmers.slice(start, start + PAGE_SIZE)

  const withScore = farmers.filter((f) => f.latestCreditScore != null).length
  const withActiveLoan = farmers.filter((f) => f.hasActiveLoan).length
  const highRisk = farmers.filter((f) => normalizeRisk(f.riskLevel) === 'HIGH').length
  const pendingLoans = farmers.filter(
    (f) => String(f.activeLoan || '').toUpperCase() === 'PENDING',
  ).length

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    riskFilter !== 'All' ||
    loanFilter !== 'All' ||
    scoreFilter !== '' ||
    sortBy !== 'risk'

  const clearFilters = () => {
    setSearchQuery('')
    setRiskFilter('All')
    setLoanFilter('All')
    setScoreFilter('')
    setSortBy('risk')
    setPage(1)
  }

  return (
    <section className="dashboard-page dashboard-page--compact farmer-directory-page">
      <PageHeader
        title="Farmers"
        subtitle="Browse consented profiles, credit scores, and lending status."
        actions={
          <>
            <Link to="/loans" className="btn-secondary">
              Loan applications
            </Link>
            <Link to="/" className="btn-primary">
              Dashboard
              <ArrowRight size={16} />
            </Link>
          </>
        }
      />

      {(highRisk > 0 || pendingLoans > 0) && !loading ? (
        <div className="dash-alerts">
          {highRisk > 0 ? (
            <button
              type="button"
              className="dash-alert dash-alert--risk"
              onClick={() => {
                setRiskFilter('HIGH')
                setPage(1)
              }}
            >
              <AlertCircle size={18} />
              <span>
                <strong>
                  {highRisk} high-risk farmer{highRisk === 1 ? '' : 's'}
                </strong>{' '}
                in the consented portfolio
              </span>
              <span className="dash-alert__action">Filter high risk</span>
            </button>
          ) : null}
          {pendingLoans > 0 ? (
            <Link to="/loans" className="dash-alert dash-alert--warn">
              <HandCoins size={18} />
              <span>
                <strong>
                  {pendingLoans} farmer{pendingLoans === 1 ? '' : 's'}
                </strong>{' '}
                with a pending loan application
              </span>
              <span className="dash-alert__action">Open loans</span>
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="widgets four">
        <StatCard title="Registered" value={loading ? '…' : String(farmers.length)} meta="With bank consent" />
        <StatCard
          title="With score"
          value={loading ? '…' : String(withScore)}
          meta="Credit assessed"
          accent="blue"
        />
        <StatCard
          title="Active loans"
          value={loading ? '…' : String(withActiveLoan)}
          meta="Pending / approved / disbursed"
          accent="slate"
        />
        <StatCard
          title="High risk"
          value={loading ? '…' : String(highRisk)}
          meta="Needs closer review"
          accent="amber"
        />
      </div>

      {loadError ? (
        <article className="card farmer-directory-alert">
          <p>{loadError}</p>
        </article>
      ) : null}

      <DataTableShell
        title="Farmer directory"
        filters={
          <div className="farmer-filters">
            <label className="filter-search farmer-filters__search">
              <span>Search</span>
              <div className="filter-search__field">
                <Search size={14} aria-hidden />
                <input
                  type="search"
                  placeholder="Name, ID, phone, email, or location"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value)
                    setPage(1)
                  }}
                />
              </div>
            </label>

            <div className="farmer-filters__chips" role="group" aria-label="Risk filter">
              {RISK_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`filter-chip${riskFilter === option.value ? ' filter-chip--active' : ''}`}
                  onClick={() => {
                    setRiskFilter(option.value)
                    setPage(1)
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="farmer-filters__row">
              <label>
                Loan status
                <select
                  value={loanFilter}
                  onChange={(event) => {
                    setLoanFilter(event.target.value)
                    setPage(1)
                  }}
                >
                  {LOAN_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Min. score
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="e.g. 60"
                  value={scoreFilter}
                  onChange={(event) => {
                    setScoreFilter(event.target.value)
                    setPage(1)
                  }}
                />
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
                <button type="button" className="btn-secondary farmer-filters__clear" onClick={clearFilters}>
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
              Showing {filteredFarmers.length === 0 ? 0 : start + 1}–
              {Math.min(start + PAGE_SIZE, filteredFarmers.length)} of {filteredFarmers.length}
              {filteredFarmers.length !== farmers.length ? ` (filtered from ${farmers.length})` : ''}
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
        <table className="desktop-table dashboard-table farmer-directory-table">
          <thead>
            <tr>
              <th>Farmer</th>
              <th>Contact</th>
              <th>Location</th>
              <th>Credit score</th>
              <th>Risk</th>
              <th>Loan</th>
              <th aria-label="Actions" />
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
            ) : pagedFarmers.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-cell">
                  {farmers.length === 0
                    ? 'No farmer profiles are available with bank consent right now.'
                    : 'No farmers match your search or filters.'}
                </td>
              </tr>
            ) : (
              pagedFarmers.map((farmer) => {
                const score = farmer.latestCreditScore
                const tone = scoreTone(score)
                return (
                  <tr key={farmer.farmerId}>
                    <td>
                      <div className="farmer-cell">
                        <strong className="dash-name">{farmer.fullName}</strong>
                        <small>ID {farmer.farmerId}</small>
                      </div>
                    </td>
                    <td>
                      <div className="farmer-cell farmer-cell--contact">
                        {farmer.phone ? (
                          <span>{formatRwandaPhoneDisplay(farmer.phone)}</span>
                        ) : (
                          <span className="muted">—</span>
                        )}
                        {farmer.email ? <small>{farmer.email}</small> : null}
                      </div>
                    </td>
                    <td className="farmer-location-cell">{farmer.location || '—'}</td>
                    <td>
                      <span className={`score-pill score-pill--${tone}`}>
                        {score ?? '—'}
                      </span>
                    </td>
                    <td>
                      <StatusBadge value={normalizeRisk(farmer.riskLevel)} />
                    </td>
                    <td>
                      <StatusBadge value={formatLoanStatus(farmer.activeLoan)} />
                    </td>
                    <td className="action-cell">
                      <Link to={`/farmer/${farmer.farmerId}`} className="btn-view">
                        Open
                        <ChevronRight size={14} aria-hidden />
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        <div className="farmer-mobile-list" aria-label="Farmer directory">
          {loading ? (
            <div className="skeleton-row" />
          ) : pagedFarmers.length === 0 ? (
            <p className="empty-cell">
              {farmers.length === 0
                ? 'No farmer profiles are available with bank consent right now.'
                : 'No farmers match your search or filters.'}
            </p>
          ) : (
            pagedFarmers.map((farmer) => (
              <article key={`m-${farmer.farmerId}`} className="farmer-mobile-card">
                <div className="farmer-mobile-card__head">
                  <div>
                    <strong>{farmer.fullName}</strong>
                    <small>ID {farmer.farmerId}</small>
                  </div>
                  <StatusBadge value={normalizeRisk(farmer.riskLevel)} />
                </div>
                <div className="farmer-mobile-card__meta">
                  <div>
                    <span>Score</span>
                    {farmer.latestCreditScore ?? '—'}
                  </div>
                  <div>
                    <span>Loan</span>
                    {formatLoanStatus(farmer.activeLoan)}
                  </div>
                  <div>
                    <span>Location</span>
                    {farmer.location || '—'}
                  </div>
                  <div>
                    <span>Phone</span>
                    {farmer.phone ? formatRwandaPhoneDisplay(farmer.phone) : '—'}
                  </div>
                </div>
                <Link to={`/farmer/${farmer.farmerId}`} className="btn-view btn-view--block">
                  View full profile
                  <ChevronRight size={14} aria-hidden />
                </Link>
              </article>
            ))
          )}
        </div>
      </DataTableShell>
    </section>
  )
}
