import { useEffect, useState } from 'react'
import MomoPaymentForm from '../components/MomoPaymentForm'
import { resolvePrimaryFarmerId } from '../services/auth'
import { getFarmers, getLoansByFarmerId } from '../services/farmerService'
import { fetchPaymentHistory, fetchWalletBalance } from '../services/momoPaymentService'
import { formatRwf } from '../utils/currency'

export default function MomoPaymentsPage() {
  const [farmerId, setFarmerId] = useState(null)
  const [loanId, setLoanId] = useState(null)
  const [wallet, setWallet] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const load = async () => {
    try {
      setLoading(true)
      setLoadError('')
      let activeFarmerId = farmerId
      if (!activeFarmerId) {
        activeFarmerId = await resolvePrimaryFarmerId()
        if (!activeFarmerId) {
          const farmers = await getFarmers()
          activeFarmerId = farmers?.[0]?.farmerId || null
        }
        setFarmerId(activeFarmerId)
      }
      if (!activeFarmerId) {
        setWallet(null)
        setHistory([])
        setLoanId(null)
        setLoadError('No farmer available for payment profile.')
        return
      }
      const [w, h, loans] = await Promise.all([
        fetchWalletBalance(activeFarmerId),
        fetchPaymentHistory(activeFarmerId),
        getLoansByFarmerId(activeFarmerId).catch(() => []),
      ])
      const repayable = (loans || []).find((loan) =>
        ['APPROVED', 'DISBURSED', 'PENDING'].includes(String(loan.status || '').toUpperCase()),
      )
      setLoanId(repayable?.loanId ?? null)
      setWallet(w)
      setHistory(h)
    } catch {
      setLoadError('Unable to load MoMo payment data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load().catch(() => {})
  }, [])

  return (
    <section className="dashboard-page momo-page">
      <article className="card hero-strip">
        <div className="breadcrumb">Sandbox Integration</div>
        <h1>MTN MoMo Payments</h1>
        <p>Track wallet, request repayments, and monitor transaction status in one banking-grade workspace.</p>
      </article>

      <div className="widgets four momo-stats">
        <article className="mini-stat">
          <span>Wallet Balance</span>
          <strong>{wallet ? formatRwf(wallet.balance) : '—'}</strong>
        </article>
        <article className="mini-stat">
          <span>Currency</span>
          <strong>{wallet?.currency || '—'}</strong>
        </article>
        <article className="mini-stat">
          <span>Payments</span>
          <strong>{history.length}</strong>
        </article>
        <article className="mini-stat">
          <span>Successful</span>
          <strong>{history.filter((row) => row.status === 'SUCCESSFUL').length}</strong>
        </article>
      </div>

      {loadError ? (
        <article className="card">
          <p>{loadError}</p>
        </article>
      ) : null}

      <div className="dashboard-grid momo-grid">
        <MomoPaymentForm farmerId={farmerId} loanId={loanId} onPaymentCreated={load} />
        {!loanId && !loading ? (
          <p className="muted momo-form-hint">No active loan found for repayment.</p>
        ) : null}

        <article className="card">
          <h2>Transaction History</h2>
          {loading ? (
            <p className="muted">Loading payment history...</p>
          ) : history.length === 0 ? (
            <p className="muted">No transactions yet.</p>
          ) : (
            <div className="table-scroll">
              <table className="desktop-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 20).map((row) => (
                    <tr key={row.paymentId}>
                      <td>{row.paymentType?.replaceAll('_', ' ')}</td>
                      <td>{row.status}</td>
                      <td>{formatRwf(row.amount)} {row.currency}</td>
                      <td>{row.phoneNumber}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </div>
    </section>
  )
}
