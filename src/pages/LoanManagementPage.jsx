import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { toast } from 'react-toastify'
import { Link, useLocation } from 'react-router-dom'
import DataTableShell from '../components/ui/DataTableShell'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import { getLoans, updateLoanStatus } from '../services/bankService'
import { formatRwf, formatRwfCompact } from '../utils/currency'
import { exportTableReport, slugifyFilename } from '../utils/exportPdf'

function LoanManagementPage() {
  const location = useLocation()
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('All Applications')
  const [riskFilter, setRiskFilter] = useState('Any Risk')
  const [searchQuery, setSearchQuery] = useState(location.state?.search || '')
  const [page, setPage] = useState(1)
  const pageSize = 10

  useEffect(() => {
    if (location.state?.search) {
      setSearchQuery(location.state.search)
      setPage(1)
    }
  }, [location.state?.search])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const data = await getLoans()
      setLoans(data)
      setLoading(false)
    }
    load()
  }, [])

  const handleStatus = async (loanId, status) => {
    try {
      const updated = await updateLoanStatus(loanId, status)
      const next = await getLoans()
      setLoans(next)
      toast.success(`${updated?.farmer || 'Loan'} ${status.toLowerCase()}.`)
    } catch {
      toast.error(`Failed to ${status.toLowerCase()} loan. Please retry.`)
    }
  }

  const filteredLoans = loans.filter((loan) => {
    const statusOk = statusFilter === 'All Applications' || loan.status === statusFilter
    const risk = loan.score >= 700 ? 'Low' : loan.score >= 620 ? 'Moderate' : 'High'
    const riskOk = riskFilter === 'Any Risk' || risk === riskFilter
    const searchOk =
      !searchQuery ||
      loan.farmer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.id.toLowerCase().includes(searchQuery.toLowerCase())
    return statusOk && riskOk && searchOk
  })
  const totalPages = Math.max(1, Math.ceil(filteredLoans.length / pageSize))
  const start = (page - 1) * pageSize
  const pagedLoans = filteredLoans.slice(start, start + pageSize)
  const approvedCount = loans.filter((loan) => loan.status === 'Approved').length
  const avgScore = loans.length
    ? Math.round(loans.reduce((sum, loan) => sum + Number(loan.score || 0), 0) / loans.length)
    : 0
  const approvalRate = loans.length ? ((approvedCount / loans.length) * 100).toFixed(1) : '0.0'
  const totalDisbursed = loans
    .filter((loan) => loan.status === 'Approved')
    .reduce((sum, loan) => sum + Number(loan.amount || 0), 0)

  const riskLabelFor = (score) =>
    score >= 700 ? 'Low Risk' : score >= 620 ? 'Moderate' : 'High Risk'

  const canDecide = (status) => String(status || '').toLowerCase() === 'pending'

  const renderLoanActions = (loan) => {
    if (!canDecide(loan.status)) {
      return loan.farmerId ? (
        <Link to={`/farmer/${loan.farmerId}`} className="btn-view">
          View farmer
        </Link>
      ) : (
        <span className="muted">No action</span>
      )
    }
    return (
      <>
        <button type="button" className="btn-primary" onClick={() => handleStatus(loan.id, 'Approved')}>
          Approve
        </button>
        <button type="button" className="btn-secondary danger" onClick={() => handleStatus(loan.id, 'Rejected')}>
          Reject
        </button>
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
      score: loan.score,
      amount: loan.amount,
      risk: loan.score >= 700 ? 'Low' : loan.score >= 620 ? 'Moderate' : 'High',
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
    <section className="dashboard-page">
      <PageHeader
        breadcrumb="Portal › Loan Management"
        title="Loan Applications"
        actions={
          <button type="button" className="btn-secondary" onClick={handleExportReport}>
            <Download size={16} aria-hidden />
            Export PDF
          </button>
        }
      />

      <div className="widgets four">
        <StatCard title="Total Applications" value={loans.length.toLocaleString()} />
        <StatCard title="Avg. Credit Score" value={avgScore.toLocaleString()} />
        <StatCard title="Approval Rate" value={`${approvalRate}%`} />
        <StatCard title="Total Disbursed" value={formatRwfCompact(totalDisbursed)} />
      </div>

      <DataTableShell
        filters={
          <>
          <label>
            Search
            <input
              type="text"
              placeholder="Farmer name or loan ID"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value)
                setPage(1)
              }}
            />
          </label>
          <label>
            Filter by Status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option>All Applications</option>
              <option>Pending</option>
              <option>Approved</option>
              <option>Rejected</option>
            </select>
          </label>
          <label>
            Risk Level
            <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)}>
              <option>Any Risk</option>
              <option>Low</option>
              <option>Moderate</option>
              <option>High</option>
            </select>
          </label>
          </>
        }
        footer={
          <>
            <span>
              Showing {Math.min(start + 1, filteredLoans.length)}-{Math.min(start + pageSize, filteredLoans.length)} of {filteredLoans.length}
            </span>
            <div className="page-actions">
              <button type="button" className="btn-secondary" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Prev
              </button>
              <button type="button" className="btn-secondary" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                Next
              </button>
            </div>
          </>
        }
      >
        <table className="desktop-table">
          <thead>
            <tr>
              <th>Farmer Name</th>
              <th>Credit Score</th>
              <th>Loan Amount</th>
              <th>Risk (Derived)</th>
              <th>Purpose</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(3)].map((_, index) => (
                <tr key={`skeleton-${index}`}>
                  <td colSpan="7">
                    <div className="skeleton-row" />
                  </td>
                </tr>
              ))
            ) : pagedLoans.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-cell">
                  No loans found. Adjust your filters or check back when farmers apply.
                </td>
              </tr>
            ) : pagedLoans.map((loan) => (
                <tr key={loan.id}>
                  <td>{loan.farmer}</td>
                  <td>{loan.score}</td>
                  <td>{formatRwf(loan.amount)}</td>
                  <td>{riskLabelFor(loan.score)}</td>
                  <td>{loan.purpose || 'General'}</td>
                  <td><StatusBadge value={loan.status} /></td>
                  <td className="action-cell">{renderLoanActions(loan)}</td>
                </tr>
              ))}
          </tbody>
        </table>

        <div className="mobile-loan-list" aria-label="Loan applications">
          {loading ? (
            <div className="skeleton-row" />
          ) : pagedLoans.length === 0 ? (
            <p className="empty-cell">No loans found. Adjust filters or create a new application.</p>
          ) : (
            pagedLoans.map((loan) => (
              <article key={`mobile-${loan.id}`} className="loan-mobile-card">
                <div className="loan-mobile-card__head">
                  <strong>{loan.farmer}</strong>
                  <StatusBadge value={loan.status} />
                </div>
                <div className="loan-mobile-card__meta">
                  <div>
                    <span>Amount</span>
                    {formatRwf(loan.amount)}
                  </div>
                  <div>
                    <span>Score</span>
                    {loan.score}
                  </div>
                  <div>
                    <span>Risk</span>
                    {riskLabelFor(loan.score)}
                  </div>
                  <div>
                    <span>Purpose</span>
                    {loan.purpose || 'General'}
                  </div>
                </div>
                <div className="loan-mobile-card__actions">
                  {renderLoanActions(loan)}
                </div>
              </article>
            ))
          )}
        </div>
      </DataTableShell>
    </section>
  )
}

export default LoanManagementPage
