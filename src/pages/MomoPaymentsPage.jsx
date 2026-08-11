import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import MomoPaymentForm from '../components/MomoPaymentForm'
import BankFarmerPaymentsView from '../components/payments/BankFarmerPaymentsView'
import InsurerPaymentsView from '../components/payments/InsurerPaymentsView'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import { usePageCopy } from '../context/AuthLocaleContext'
import { getCurrentUser, resolvePrimaryFarmerId } from '../services/auth'
import { getFarmerById, getFarmers, getLoansByFarmerId } from '../services/farmerService'
import { fetchPaymentHistory, fetchWalletBalance } from '../services/momoPaymentService'
import { formatRwf } from '../utils/currency'
import { rememberLastFarmerId } from './FarmerProfileRedirect'

function formatDisplayName(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

export default function MomoPaymentsPage() {
  const { s, p } = usePageCopy('momoPayments')
  const [searchParams, setSearchParams] = useSearchParams()
  const role = getCurrentUser()?.role || 'BANK'
  const isBankViewer = role === 'BANK' || role === 'ADMIN'
  const isInsurerViewer = role === 'INSURER'

  const [farmers, setFarmers] = useState([])
  const [farmerQuery, setFarmerQuery] = useState('')
  const [selectedFarmer, setSelectedFarmer] = useState(null)
  const [farmerId, setFarmerId] = useState(null)
  const [loanId, setLoanId] = useState(null)
  const [wallet, setWallet] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const filteredFarmers = useMemo(() => {
    const q = farmerQuery.trim().toLowerCase()
    if (!q) return farmers
    return farmers.filter((farmer) => {
      const hay = `${farmer.fullName || ''} ${farmer.farmerId || ''} ${farmer.phone || ''} ${farmer.nationalId || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [farmers, farmerQuery])

  const selectFarmer = async (id) => {
    const normalized = Number(id)
    if (!normalized) {
      setSelectedFarmer(null)
      setFarmerId(null)
      setSearchParams({})
      return
    }
    setFarmerId(normalized)
    setSearchParams({ farmerId: String(normalized) })
    rememberLastFarmerId(normalized)
    try {
      const farmer = await getFarmerById(normalized)
      setSelectedFarmer(farmer)
      rememberLastFarmerId(normalized, farmer)
    } catch {
      const fallback = farmers.find((row) => Number(row.farmerId) === normalized) || null
      setSelectedFarmer(fallback)
    }
  }

  useEffect(() => {
    if (!isBankViewer) return undefined

    const boot = async () => {
      try {
        setLoading(true)
        setLoadError('')
        const list = await getFarmers()
        setFarmers(list || [])

        const fromQuery = Number(searchParams.get('farmerId'))
        const initialId = fromQuery || Number(list?.[0]?.farmerId) || null

        if (initialId) {
          await selectFarmer(initialId)
        } else {
          setLoadError(p.noFarmers)
        }
      } catch {
        setLoadError(p.loadFarmersFailed)
      } finally {
        setLoading(false)
      }
    }

    boot()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBankViewer])

  const loadFarmerSelf = async () => {
    try {
      setLoading(true)
      setLoadError('')
      let activeFarmerId = farmerId
      if (!activeFarmerId) {
        activeFarmerId = await resolvePrimaryFarmerId()
        if (!activeFarmerId) {
          const farmerList = await getFarmers()
          activeFarmerId = farmerList?.[0]?.farmerId || null
        }
        setFarmerId(activeFarmerId)
      }
      if (!activeFarmerId) {
        setWallet(null)
        setHistory([])
        setLoanId(null)
        setLoadError(p.noFarmerProfile)
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
      setLoadError(p.loadFailed)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isBankViewer || isInsurerViewer) return undefined
    loadFarmerSelf().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBankViewer, isInsurerViewer])

  if (isInsurerViewer) {
    return <InsurerPaymentsView />
  }

  if (isBankViewer) {
    return (
      <section className="dashboard-page momo-page dashboard-page--compact bank-payments-page">
        <PageHeader title={p.title} subtitle={p.bankSubtitle} />

        <article className="card bank-pay-picker">
          <div className="bank-pay-picker__row">
            <label htmlFor="bank-pay-farmer-search">
              {p.farmerLabel}
              <input
                id="bank-pay-farmer-search"
                type="search"
                placeholder={p.searchPlaceholder}
                value={farmerQuery}
                onChange={(event) => setFarmerQuery(event.target.value)}
              />
            </label>
            <label htmlFor="bank-pay-farmer-select">
              {p.select}
              <select
                id="bank-pay-farmer-select"
                value={farmerId || ''}
                onChange={(event) => selectFarmer(event.target.value)}
                disabled={loading && !farmers.length}
              >
                <option value="">{p.chooseFarmer}</option>
                {filteredFarmers.map((farmer) => (
                  <option key={farmer.farmerId} value={farmer.farmerId}>
                    {formatDisplayName(farmer.fullName) || `Farmer #${farmer.farmerId}`} · #{farmer.farmerId}
                  </option>
                ))}
              </select>
            </label>
            {farmerId ? (
              <Link to={`/farmer/${farmerId}`} className="btn-secondary bank-pay-picker__profile">
                {p.openProfile}
              </Link>
            ) : null}
          </div>
          <p className="bank-pay-picker__hint">{p.viewOnlyHint}</p>
        </article>

        {loadError && !selectedFarmer ? (
          <article className="card">
            <p>{loadError}</p>
          </article>
        ) : null}

        <BankFarmerPaymentsView farmer={selectedFarmer} />
      </section>
    )
  }

  const successfulCount = history.filter((row) => row.status === 'SUCCESSFUL').length

  return (
    <section className="dashboard-page momo-page dashboard-page--compact">
      <PageHeader title={p.title} subtitle={p.farmerSubtitle} />

      <div className="widgets three">
        <StatCard
          title={p.walletBalance}
          value={wallet ? formatRwf(wallet.balance) : '—'}
          meta={wallet?.currency || 'RWF'}
          accent="green"
        />
        <StatCard
          title={p.transactions}
          value={String(history.length)}
          meta={p.successful(successfulCount)}
        />
        <StatCard
          title={p.loanRepay}
          value={loanId ? p.ready : s.none}
          meta={loanId ? p.activeLoanFound : p.noRepayableLoan}
          accent={loanId ? 'blue' : 'slate'}
        />
      </div>

      {loadError ? (
        <article className="card">
          <p>{loadError}</p>
        </article>
      ) : null}

      <div className="dashboard-grid momo-grid">
        <MomoPaymentForm farmerId={farmerId} loanId={loanId} onPaymentCreated={loadFarmerSelf} />
        {!loanId && !loading ? (
          <p className="muted momo-form-hint">{p.noActiveLoan}</p>
        ) : null}

        <article className="card">
          <div className="section-head">
            <div>
              <h2>{p.recentTransactions}</h2>
              <p className="card-subtitle">{p.recentMeta}</p>
            </div>
          </div>
          {loading ? (
            <p className="muted">{p.loadingHistory}</p>
          ) : history.length === 0 ? (
            <p className="muted">{p.empty}</p>
          ) : (
            <div className="table-scroll">
              <table className="desktop-table">
                <thead>
                  <tr>
                    <th>{p.colType}</th>
                    <th>{p.colStatus}</th>
                    <th>{p.colAmount}</th>
                    <th>{p.colPhone}</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 20).map((row) => (
                    <tr key={row.paymentId}>
                      <td>{String(row.paymentType || '').replaceAll('_', ' ')}</td>
                      <td>{row.status}</td>
                      <td>
                        {formatRwf(row.amount)} {row.currency || 'RWF'}
                      </td>
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
