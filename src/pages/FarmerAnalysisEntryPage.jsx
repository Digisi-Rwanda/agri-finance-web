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
import { usePageCopy } from '../context/AuthLocaleContext'
import { translateStatusLabel } from '../i18n/portalUtils'
import { getFarmersWithInsights } from '../services/farmerService'
import { formatRwandaPhoneDisplay } from '../utils/rwandaPhone'

const PAGE_SIZE = 12

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
  const { s, p } = usePageCopy('farmerDirectory')
  const portal = useMemo(() => ({ shared: s, pages: { farmerDirectory: p } }), [s, p])
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

  const riskOptions = useMemo(
    () => [
      { value: 'All', label: p.allRisk },
      { value: 'HIGH', label: s.risk.high },
      { value: 'MEDIUM', label: s.risk.medium },
      { value: 'LOW', label: s.risk.low },
      { value: 'UNKNOWN', label: 'Unknown' },
    ],
    [p.allRisk, s.risk],
  )

  const loanOptions = useMemo(
    () => [
      { value: 'All', label: `${s.all} ${s.loans.toLowerCase()}` },
      { value: 'PENDING', label: s.statuses.PENDING },
      { value: 'APPROVED', label: s.statuses.APPROVED },
      { value: 'DISBURSED', label: s.statuses.DISBURSED },
      { value: 'NONE', label: 'No active loan' },
    ],
    [s],
  )

  const sortOptions = useMemo(
    () => [
      { value: 'name', label: p.sortName },
      { value: 'score-desc', label: p.sortScoreDesc },
      { value: 'score-asc', label: p.sortScoreAsc },
      { value: 'risk', label: p.sortRisk },
    ],
    [p],
  )

  const formatLoanStatus = (status) => {
    if (!status) return s.none
    return translateStatusLabel(portal, status)
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
        const data = await getFarmersWithInsights()
        setFarmers(Array.isArray(data) ? data : [])
      } catch {
        setLoadError(p.loadFailed)
        setFarmers([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [p.loadFailed])

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

  const footerFrom = filteredFarmers.length === 0 ? 0 : start + 1
  const footerTo = Math.min(start + PAGE_SIZE, filteredFarmers.length)

  return (
    <section className="dashboard-page dashboard-page--compact farmer-directory-page">
      <PageHeader
        title={p.title}
        subtitle={p.subtitle}
        actions={
          <>
            <Link to="/loans" className="btn-secondary">
              {p.loanApplications}
            </Link>
            <Link to="/" className="btn-primary">
              {p.dashboard}
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
              <span>{p.highRiskAlert(highRisk)}</span>
              <span className="dash-alert__action">{p.filterHighRisk}</span>
            </button>
          ) : null}
          {pendingLoans > 0 ? (
            <Link to="/loans" className="dash-alert dash-alert--warn">
              <HandCoins size={18} />
              <span>{p.pendingAlert(pendingLoans)}</span>
              <span className="dash-alert__action">{p.openLoans}</span>
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="widgets four">
        <StatCard
          title={p.registered}
          value={loading ? '…' : String(farmers.length)}
          meta={p.registeredMeta}
        />
        <StatCard
          title={p.withScore}
          value={loading ? '…' : String(withScore)}
          meta={p.withScoreMeta}
          accent="blue"
        />
        <StatCard
          title={p.activeLoans}
          value={loading ? '…' : String(withActiveLoan)}
          meta="Pending / approved / disbursed"
          accent="slate"
        />
        <StatCard
          title={p.highRisk}
          value={loading ? '…' : String(highRisk)}
          meta={p.highRiskMeta}
          accent="amber"
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
          <div className="farmer-filters">
            <label className="filter-search farmer-filters__search">
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

            <div className="farmer-filters__chips" role="group" aria-label="Risk filter">
              {riskOptions.map((option) => (
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
                {p.loanStatus}
                <select
                  value={loanFilter}
                  onChange={(event) => {
                    setLoanFilter(event.target.value)
                    setPage(1)
                  }}
                >
                  {loanOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {p.minScore}
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder={p.minScorePlaceholder}
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
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              {hasActiveFilters ? (
                <button type="button" className="btn-secondary farmer-filters__clear" onClick={clearFilters}>
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
              {s.showing(footerFrom, footerTo, filteredFarmers.length)}
              {filteredFarmers.length !== farmers.length ? ` (filtered from ${farmers.length})` : ''}
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
        <table className="desktop-table dashboard-table farmer-directory-table">
          <thead>
            <tr>
              <th>{p.colFarmer}</th>
              <th>{p.colContact}</th>
              <th>{p.colLocation}</th>
              <th>{p.colScore}</th>
              <th>{p.colRisk}</th>
              <th>{p.colLoan}</th>
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
                  {farmers.length === 0 ? p.empty : p.emptyFilter}
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
                        {p.open}
                        <ChevronRight size={14} aria-hidden />
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        <div className="farmer-mobile-list" aria-label={p.tableTitle}>
          {loading ? (
            <div className="skeleton-row" />
          ) : pagedFarmers.length === 0 ? (
            <p className="empty-cell">{farmers.length === 0 ? p.empty : p.emptyFilter}</p>
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
                    <span>{p.colScore}</span>
                    {farmer.latestCreditScore ?? '—'}
                  </div>
                  <div>
                    <span>{p.colLoan}</span>
                    {formatLoanStatus(farmer.activeLoan)}
                  </div>
                  <div>
                    <span>{p.colLocation}</span>
                    {farmer.location || '—'}
                  </div>
                  <div>
                    <span>Phone</span>
                    {farmer.phone ? formatRwandaPhoneDisplay(farmer.phone) : '—'}
                  </div>
                </div>
                <Link to={`/farmer/${farmer.farmerId}`} className="btn-view btn-view--block">
                  {p.viewProfile}
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
