import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, RefreshCw, Eye } from 'lucide-react'
import StatusBadge from '../ui/StatusBadge'
import {
  fetchEkashStatement,
  fetchEkashStatus,
  fetchPaymentHistoryWithRefresh,
  fetchWalletBalance,
  refreshPaymentStatus,
  syncEkashStatement,
} from '../../services/momoPaymentService'
import {
  getLoansByFarmerId,
  getMobileMoneyByFarmerId,
  getRepaymentHealth,
  getRepaymentsByLoanId,
} from '../../services/farmerService'
import { formatRwf } from '../../utils/currency'
import { formatRwandaPhoneDisplay } from '../../utils/rwandaPhone'

function formatDate(value) {
  if (!value) return '—'
  return String(value).replace('T', ' ').slice(0, 16)
}

function formatDateShort(value) {
  if (!value) return '—'
  return String(value).slice(0, 10)
}

function pickHealthLoan(loans) {
  const rank = (status) => {
    const value = String(status || '').toUpperCase()
    if (value === 'DISBURSED') return 4
    if (value === 'APPROVED') return 3
    if (value === 'PENDING') return 2
    return 0
  }
  return [...(loans || [])]
    .filter((loan) => loan?.loanId != null)
    .sort((a, b) => rank(b.status) - rank(a.status) || Number(b.loanId) - Number(a.loanId))[0] || null
}

/**
 * Read-only mirror of what a farmer sees in the mobile finance/payment area.
 * Bank / admin view only — no initiate repay / disbursement.
 */
export default function BankFarmerPaymentsView({ farmer }) {
  const farmerId = farmer?.farmerId
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [wallet, setWallet] = useState(null)
  const [history, setHistory] = useState([])
  const [momoLedger, setMomoLedger] = useState([])
  const [loans, setLoans] = useState([])
  const [repayments, setRepayments] = useState([])
  const [repaymentHealth, setRepaymentHealth] = useState(null)
  const [ekashStatus, setEkashStatus] = useState(null)
  const [ekashStatement, setEkashStatement] = useState(null)
  const [ekashError, setEkashError] = useState('')
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [busyPaymentId, setBusyPaymentId] = useState(null)
  const [syncingEkash, setSyncingEkash] = useState(false)
  const [activeTab, setActiveTab] = useState('gateway')

  const load = async () => {
    if (!farmerId) return
    try {
      setLoading(true)
      setError('')
      setEkashError('')

      const [walletResult, historyResult, momoResult, loansResult, ekashStatusResult] =
        await Promise.allSettled([
          fetchWalletBalance(farmerId),
          fetchPaymentHistoryWithRefresh(farmerId),
          getMobileMoneyByFarmerId(farmerId),
          getLoansByFarmerId(farmerId),
          fetchEkashStatus(),
        ])

      setWallet(walletResult.status === 'fulfilled' ? walletResult.value : null)
      setHistory(historyResult.status === 'fulfilled' ? historyResult.value || [] : [])
      setMomoLedger(momoResult.status === 'fulfilled' ? momoResult.value || [] : [])
      const loanList = loansResult.status === 'fulfilled' ? loansResult.value || [] : []
      setLoans(loanList)
      setEkashStatus(ekashStatusResult.status === 'fulfilled' ? ekashStatusResult.value : null)

      const healthLoan = pickHealthLoan(loanList)
      const repaySettled = await Promise.allSettled(
        loanList.filter((loan) => loan?.loanId).map((loan) => getRepaymentsByLoanId(loan.loanId)),
      )
      const allRepayments = repaySettled
        .filter((result) => result.status === 'fulfilled')
        .flatMap((result) => result.value || [])
        .sort((a, b) => String(b.paymentDate || '').localeCompare(String(a.paymentDate || '')))
      setRepayments(allRepayments)

      if (healthLoan?.loanId) {
        const health = await getRepaymentHealth(healthLoan.loanId).catch(() => null)
        setRepaymentHealth(health)
      } else {
        setRepaymentHealth(null)
      }

      try {
        const statement = await fetchEkashStatement(farmerId, {
          phone: farmer.phone,
          days: 90,
        })
        setEkashStatement(statement)
      } catch (err) {
        setEkashStatement(null)
        setEkashError(err?.response?.data?.error || 'eKash statement unavailable for this farmer.')
      }
    } catch {
      setError('Unable to load this farmer payment activity.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmerId])

  const schedule = Array.isArray(repaymentHealth?.schedule) ? repaymentHealth.schedule : []
  const ekashLines = Array.isArray(ekashStatement?.lines) ? ekashStatement.lines : []

  const stats = useMemo(() => {
    const successful = history.filter((row) =>
      ['SUCCESSFUL', 'SUCCESS', 'COMPLETED'].includes(String(row.status || '').toUpperCase()),
    ).length
    const pending = history.filter((row) => String(row.status || '').toUpperCase() === 'PENDING').length
    return { successful, pending, momo: momoLedger.length, repayments: repayments.length }
  }, [history, momoLedger, repayments])

  const handleRefreshOne = async (paymentId) => {
    try {
      setBusyPaymentId(paymentId)
      const updated = await refreshPaymentStatus(paymentId)
      setHistory((prev) =>
        prev.map((row) => (row.paymentId === paymentId ? { ...row, ...updated } : row)),
      )
      if (selectedPayment?.paymentId === paymentId) {
        setSelectedPayment((prev) => ({ ...prev, ...updated }))
      }
    } finally {
      setBusyPaymentId(null)
    }
  }

  const handleSyncEkash = async () => {
    try {
      setSyncingEkash(true)
      setEkashError('')
      const statement = await syncEkashStatement(farmerId, { phone: farmer.phone, days: 90 })
      setEkashStatement(statement)
    } catch (err) {
      setEkashError(err?.response?.data?.error || 'Could not refresh eKash statement.')
    } finally {
      setSyncingEkash(false)
    }
  }

  if (!farmerId) {
    return (
      <article className="card bank-pay-empty">
        <p>Select a consented farmer to view their payment activity from the farmer app.</p>
      </article>
    )
  }

  return (
    <div className="bank-pay-view">
      <div className="bank-pay-view__toolbar">
        <div>
          <p className="bank-pay-view__eyebrow">Farmer app · view only</p>
          <h2 className="bank-pay-view__title">{farmer.fullName || `Farmer #${farmerId}`}</h2>
          <p className="bank-pay-view__meta">
            ID {farmerId}
            {farmer.phone ? ` · ${formatRwandaPhoneDisplay(farmer.phone)}` : ''}
            {farmer.nationalId ? ` · NID ${farmer.nationalId}` : ''}
          </p>
        </div>
        <div className="bank-pay-view__actions">
          <button type="button" className="btn-secondary" onClick={load} disabled={loading}>
            <RefreshCw size={15} aria-hidden />
            Refresh
          </button>
          <Link to={`/farmer/${farmerId}`} className="btn-primary">
            <ExternalLink size={15} aria-hidden />
            Full profile
          </Link>
        </div>
      </div>

      <div className="bank-pay-stats">
        <div>
          <span>Wallet</span>
          <strong>{wallet ? formatRwf(wallet.balance) : '—'}</strong>
        </div>
        <div>
          <span>Gateway payments</span>
          <strong>{history.length}</strong>
        </div>
        <div>
          <span>Successful</span>
          <strong>{stats.successful}</strong>
        </div>
        <div>
          <span>Pending</span>
          <strong>{stats.pending}</strong>
        </div>
        <div>
          <span>MoMo ledger</span>
          <strong>{stats.momo}</strong>
        </div>
        <div>
          <span>Loan repayments</span>
          <strong>{stats.repayments}</strong>
        </div>
      </div>

      {error ? (
        <article className="card">
          <p>{error}</p>
        </article>
      ) : null}

      {loading ? (
        <p className="muted">Loading farmer payment data…</p>
      ) : (
        <>
          <div className="detail-tabs bank-pay-tabs" role="tablist" aria-label="Payment sections">
            {[
              { id: 'gateway', label: 'Payment history', count: history.length },
              { id: 'momo', label: 'MoMo ledger', count: momoLedger.length },
              { id: 'ekash', label: 'eKash', count: ekashLines.length },
              { id: 'schedule', label: 'Repayment schedule', count: schedule.length },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`detail-tab${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                <span className="detail-tab__count">{tab.count}</span>
              </button>
            ))}
          </div>

          {activeTab === 'gateway' ? (
            <article className="card bank-pay-panel">
              <header className="bank-pay-panel__head">
                <div>
                  <h3>Gateway payment history</h3>
                  <p>Same feed as the farmer Payment History screen (with pending status refresh).</p>
                </div>
              </header>
              {history.length === 0 ? (
                <p className="muted">No gateway payments for this farmer.</p>
              ) : (
                <div className="table-scroll">
                  <table className="desktop-table dashboard-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Provider</th>
                        <th>Status</th>
                        <th>Amount</th>
                        <th>Phone</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {history.slice(0, 40).map((row) => (
                        <tr key={row.paymentId}>
                          <td>{formatDate(row.createdAt || row.updatedAt)}</td>
                          <td>{String(row.paymentType || '—').replaceAll('_', ' ')}</td>
                          <td>{row.provider || '—'}</td>
                          <td>
                            <StatusBadge value={row.status} />
                          </td>
                          <td>
                            {formatRwf(row.amount)} {row.currency || 'RWF'}
                          </td>
                          <td>{row.phoneNumber ? formatRwandaPhoneDisplay(row.phoneNumber) : '—'}</td>
                          <td className="bank-pay-row-actions">
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => setSelectedPayment(row)}
                            >
                              <Eye size={14} aria-hidden />
                              View
                            </button>
                            {String(row.status || '').toUpperCase() === 'PENDING' ? (
                              <button
                                type="button"
                                className="btn-secondary"
                                disabled={busyPaymentId === row.paymentId}
                                onClick={() => handleRefreshOne(row.paymentId)}
                              >
                                <RefreshCw size={14} aria-hidden />
                                Status
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          ) : null}

          {activeTab === 'momo' ? (
            <article className="card bank-pay-panel">
              <header className="bank-pay-panel__head">
                <div>
                  <h3>Mobile money ledger</h3>
                  <p>MoMo movements the farmer recorded or linked in the app.</p>
                </div>
              </header>
              {momoLedger.length === 0 ? (
                <p className="muted">No MoMo ledger entries.</p>
              ) : (
                <div className="table-scroll">
                  <table className="desktop-table dashboard-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Provider</th>
                        <th>Direction</th>
                        <th>Status</th>
                        <th>Amount</th>
                        <th>Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {momoLedger.slice(0, 40).map((row) => (
                        <tr key={row.transactionId || `${row.provider}-${row.createdAt}`}>
                          <td>{formatDate(row.createdAt)}</td>
                          <td>{row.provider || '—'}</td>
                          <td>{row.direction || row.purpose || '—'}</td>
                          <td>
                            <StatusBadge value={row.status || '—'} />
                          </td>
                          <td>{formatRwf(row.amount)}</td>
                          <td>{row.externalReference || row.reference || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          ) : null}

          {activeTab === 'ekash' ? (
            <article className="card bank-pay-panel">
              <header className="bank-pay-panel__head">
                <div>
                  <h3>eKash statement</h3>
                  <p>
                    Same eKash account view as the farmer app
                    {ekashStatus?.configured === false ? ' · provider may be offline' : ''}
                    {ekashStatement?.source ? ` · source ${ekashStatement.source}` : ''}.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleSyncEkash}
                  disabled={syncingEkash}
                >
                  <RefreshCw size={15} aria-hidden />
                  {syncingEkash ? 'Syncing…' : 'Sync statement'}
                </button>
              </header>

              <div className="bank-pay-stats bank-pay-stats--compact">
                <div>
                  <span>Balance</span>
                  <strong>
                    {ekashStatement?.balance != null ? formatRwf(ekashStatement.balance) : '—'}
                  </strong>
                </div>
                <div>
                  <span>Network</span>
                  <strong>{ekashStatement?.network || '—'}</strong>
                </div>
                <div>
                  <span>Phone</span>
                  <strong>
                    {ekashStatement?.phone
                      ? formatRwandaPhoneDisplay(ekashStatement.phone)
                      : farmer.phone
                        ? formatRwandaPhoneDisplay(farmer.phone)
                        : '—'}
                  </strong>
                </div>
              </div>

              {ekashError ? <p className="muted">{ekashError}</p> : null}

              {ekashLines.length === 0 && !ekashError ? (
                <p className="muted">No eKash statement lines.</p>
              ) : ekashLines.length > 0 ? (
                <div className="table-scroll">
                  <table className="desktop-table dashboard-table">
                    <thead>
                      <tr>
                        <th>When</th>
                        <th>Direction</th>
                        <th>Amount</th>
                        <th>Counterparty</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ekashLines.slice(0, 40).map((line, index) => (
                        <tr key={`${line.reference || 'line'}-${index}`}>
                          <td>{formatDate(line.occurredAt)}</td>
                          <td>{line.direction || '—'}</td>
                          <td>{formatRwf(line.amount)}</td>
                          <td>{line.counterparty || '—'}</td>
                          <td>{line.description || line.reference || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </article>
          ) : null}

          {activeTab === 'schedule' ? (
            <article className="card bank-pay-panel">
              <header className="bank-pay-panel__head">
                <div>
                  <h3>Repayment schedule</h3>
                  <p>
                    {repaymentHealth?.loanId
                      ? `Loan #${repaymentHealth.loanId} — paid / overdue / remaining (farmer repayment screen).`
                      : 'No disbursed/approved loan with a schedule.'}
                  </p>
                </div>
              </header>

              {repaymentHealth ? (
                <div className="bank-pay-stats bank-pay-stats--compact">
                  <div>
                    <span>Remaining</span>
                    <strong>{formatRwf(repaymentHealth.remainingPrincipal)}</strong>
                  </div>
                  <div>
                    <span>Total paid</span>
                    <strong>{formatRwf(repaymentHealth.totalPaid)}</strong>
                  </div>
                  <div>
                    <span>Monthly</span>
                    <strong>{formatRwf(repaymentHealth.monthlyPayment)}</strong>
                  </div>
                  <div>
                    <span>Overdue</span>
                    <strong>{repaymentHealth.overdueInstallments ?? 0}</strong>
                  </div>
                </div>
              ) : null}

              {schedule.length === 0 ? (
                <p className="muted">No installment schedule available.</p>
              ) : (
                <div className="table-scroll">
                  <table className="desktop-table dashboard-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Due</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedule.map((row) => (
                        <tr key={`s-${row.period}-${row.dueDate}`}>
                          <td>{row.period}</td>
                          <td>{formatDateShort(row.dueDate)}</td>
                          <td>{formatRwf(row.amountDue)}</td>
                          <td>
                            <StatusBadge value={row.status || '—'} />
                            {row.daysOverdue > 0 ? (
                              <small className="lending-overdue-days">{row.daysOverdue}d overdue</small>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {repayments.length > 0 ? (
                <>
                  <h4 className="bank-pay-panel__sub">Recorded repayments</h4>
                  <div className="table-scroll">
                    <table className="desktop-table dashboard-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Loan</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {repayments.slice(0, 20).map((row) => (
                          <tr key={row.repaymentId || `${row.loanId}-${row.paymentDate}`}>
                            <td>{formatDate(row.paymentDate)}</td>
                            <td>#{row.loanId}</td>
                            <td>{formatRwf(row.amountPaid)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}

              {loans.length > 0 ? (
                <p className="bank-pay-footnote">
                  Loans on file:{' '}
                  {loans
                    .map((loan) => `#${loan.loanId} (${String(loan.status || '').toLowerCase()})`)
                    .join(' · ')}
                </p>
              ) : null}
            </article>
          ) : null}
        </>
      )}

      {selectedPayment ? (
        <div
          className="bank-pay-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-detail-title"
          onClick={() => setSelectedPayment(null)}
        >
          <article className="card bank-pay-modal__card" onClick={(event) => event.stopPropagation()}>
            <header>
              <h3 id="payment-detail-title">Payment detail</h3>
              <button type="button" className="btn-secondary" onClick={() => setSelectedPayment(null)}>
                Close
              </button>
            </header>
            <dl className="bank-pay-detail">
              <div>
                <dt>ID</dt>
                <dd>{selectedPayment.paymentId}</dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{String(selectedPayment.paymentType || '—').replaceAll('_', ' ')}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <StatusBadge value={selectedPayment.status} />
                </dd>
              </div>
              <div>
                <dt>Amount</dt>
                <dd>
                  {formatRwf(selectedPayment.amount)} {selectedPayment.currency || 'RWF'}
                </dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>
                  {selectedPayment.phoneNumber
                    ? formatRwandaPhoneDisplay(selectedPayment.phoneNumber)
                    : '—'}
                </dd>
              </div>
              <div>
                <dt>Provider</dt>
                <dd>{selectedPayment.provider || '—'}</dd>
              </div>
              <div>
                <dt>External ID</dt>
                <dd>{selectedPayment.externalId || '—'}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatDate(selectedPayment.createdAt)}</dd>
              </div>
            </dl>
            {String(selectedPayment.status || '').toUpperCase() === 'PENDING' ? (
              <button
                type="button"
                className="btn-primary"
                disabled={busyPaymentId === selectedPayment.paymentId}
                onClick={() => handleRefreshOne(selectedPayment.paymentId)}
              >
                Refresh status
              </button>
            ) : null}
          </article>
        </div>
      ) : null}
    </div>
  )
}
