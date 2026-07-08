import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, Search } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import DataTableShell from '../components/ui/DataTableShell'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import { getFarmersWithInsights } from '../services/farmerService'
import { formatRwandaPhoneDisplay } from '../utils/rwandaPhone'

const PAGE_SIZE = 12

function formatLoanStatus(status) {
  if (!status) return 'None'
  const lower = String(status).toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

export default function FarmerAnalysisEntryPage() {
  const location = useLocation()
  const [farmers, setFarmers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [searchQuery, setSearchQuery] = useState(location.state?.search || '')
  const [riskFilter, setRiskFilter] = useState('All')
  const [scoreFilter, setScoreFilter] = useState('')
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
    return farmers.filter((farmer) => {
      const score = Number(farmer.latestCreditScore ?? farmer.creditScore)
      const risk = farmer.riskLevel || 'Unknown'
      const scoreOk = scoreFilter ? farmer.latestCreditScore != null && score >= Number(scoreFilter) : true
      const riskOk = riskFilter === 'All' ? true : risk === riskFilter
      const searchOk =
        !query ||
        farmer.fullName?.toLowerCase().includes(query) ||
        String(farmer.farmerId).includes(query) ||
        farmer.phone?.includes(query) ||
        farmer.email?.toLowerCase().includes(query) ||
        farmer.location?.toLowerCase().includes(query)
      return scoreOk && riskOk && searchOk
    })
  }, [farmers, searchQuery, riskFilter, scoreFilter])

  const totalPages = Math.max(1, Math.ceil(filteredFarmers.length / PAGE_SIZE))
  const start = (page - 1) * PAGE_SIZE
  const pagedFarmers = filteredFarmers.slice(start, start + PAGE_SIZE)

  const withScore = farmers.filter((f) => f.latestCreditScore != null).length
  const withActiveLoan = farmers.filter((f) => f.hasActiveLoan).length
  const lowRisk = farmers.filter((f) => f.riskLevel === 'Low').length

  return (
    <section className="dashboard-page farmer-directory-page">
      <PageHeader
        breadcrumb="Portal › Farmer Analysis"
        subtitle="Browse consented farmer profiles, credit scores, and lending status."
        actions={
          <Link to="/loans" className="btn-primary">
            Loan applications
          </Link>
        }
      />

      <div className="widgets four">
        <StatCard title="Registered farmers" value={loading ? '…' : String(farmers.length)} />
        <StatCard title="With credit score" value={loading ? '…' : String(withScore)} />
        <StatCard title="Active loans" value={loading ? '…' : String(withActiveLoan)} />
        <StatCard title="Low risk" value={loading ? '…' : String(lowRisk)} />
      </div>

      {loadError ? (
        <article className="card farmer-directory-alert">
          <p>{loadError}</p>
        </article>
      ) : null}

      <DataTableShell
        title="Farmer directory"
        filters={
          <>
            <label className="filter-search">
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
            <label>
              Min. credit score
              <input
                type="number"
                placeholder="e.g. 650"
                value={scoreFilter}
                onChange={(event) => {
                  setScoreFilter(event.target.value)
                  setPage(1)
                }}
              />
            </label>
            <label>
              Risk level
              <select
                value={riskFilter}
                onChange={(event) => {
                  setRiskFilter(event.target.value)
                  setPage(1)
                }}
              >
                <option>All</option>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Unknown</option>
              </select>
            </label>
          </>
        }
        footer={
          <>
            <span>
              Showing {filteredFarmers.length === 0 ? 0 : start + 1}–
              {Math.min(start + PAGE_SIZE, filteredFarmers.length)} of {filteredFarmers.length}
            </span>
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
          </>
        }
      >
        <div className="table-scroll">
          <table className="desktop-table dashboard-table">
            <thead>
              <tr>
                <th>Farmer</th>
                <th>Contact</th>
                <th>Location</th>
                <th>Credit score</th>
                <th>Risk</th>
                <th>Loan status</th>
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
                pagedFarmers.map((farmer) => (
                  <tr key={farmer.farmerId}>
                    <td>
                      <div className="farmer-cell">
                        <strong>{farmer.fullName}</strong>
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
                    <td>{farmer.location || '—'}</td>
                    <td>{farmer.latestCreditScore ?? '—'}</td>
                    <td>
                      <StatusBadge value={farmer.riskLevel || 'Unknown'} />
                    </td>
                    <td>{formatLoanStatus(farmer.activeLoan)}</td>
                    <td className="action-cell">
                      <Link to={`/farmer/${farmer.farmerId}`} className="btn-view">
                        View profile
                        <ChevronRight size={14} aria-hidden />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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
                  <StatusBadge value={farmer.riskLevel || 'Unknown'} />
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
