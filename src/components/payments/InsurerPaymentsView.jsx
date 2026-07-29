import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { RefreshCw, ShieldCheck } from 'lucide-react'
import PageHeader from '../ui/PageHeader'
import StatCard from '../ui/StatCard'
import StatusBadge from '../ui/StatusBadge'
import DataTableShell from '../ui/DataTableShell'
import { getPolicies, listFarmersForInsurance } from '../../services/insuranceService'
import {
  fetchPaymentHistory,
  fetchPaymentHistoryWithRefresh,
  requestInsurancePayment,
  refreshPaymentStatus,
} from '../../services/momoPaymentService'
import { formatRwf, formatRwfCompact } from '../../utils/currency'

const PROVIDERS = [
  { value: 'MTN_MOMO', label: 'MTN MoMo' },
  { value: 'AIRTEL_MONEY', label: 'Airtel Money' },
]

function formatDisplayName(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function isInsurancePayment(row) {
  return String(row.paymentType || '')
    .toUpperCase()
    .includes('INSURANCE')
}

function isSuccessful(row) {
  return ['SUCCESSFUL', 'SUCCESS', 'COMPLETED'].includes(String(row.status || '').toUpperCase())
}

function isCurrentlyActive(policy) {
  if (String(policy.status || '').toUpperCase() !== 'ACTIVE') return false
  const d = new Date()
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  if (policy.validFrom && String(policy.validFrom) > today) return false
  if (policy.validTo && String(policy.validTo) < today) return false
  return true
}

/**
 * Insurer Payments: collect MoMo premiums for issued policies and review collections.
 */
export default function InsurerPaymentsView() {
  const [farmers, setFarmers] = useState([])
  const [policies, setPolicies] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busyPaymentId, setBusyPaymentId] = useState(null)
  const [loadError, setLoadError] = useState('')

  const [farmerId, setFarmerId] = useState('')
  const [policyId, setPolicyId] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [amount, setAmount] = useState('')
  const [provider, setProvider] = useState('MTN_MOMO')
  const [farmerQuery, setFarmerQuery] = useState('')

  const load = async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [farmerList, policyList, paymentList] = await Promise.all([
        listFarmersForInsurance().catch(() => []),
        getPolicies().catch(() => []),
        fetchPaymentHistory().catch(() => []),
      ])
      setFarmers(Array.isArray(farmerList) ? farmerList : [])
      setPolicies(Array.isArray(policyList) ? policyList : [])
      setHistory(Array.isArray(paymentList) ? paymentList : [])
    } catch {
      setLoadError('Could not load premium collection data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const farmersById = useMemo(
    () => Object.fromEntries(farmers.map((farmer) => [String(farmer.farmerId), farmer])),
    [farmers],
  )

  const filteredFarmers = useMemo(() => {
    const q = farmerQuery.trim().toLowerCase()
    if (!q) return farmers
    return farmers.filter((farmer) => {
      const hay = `${farmer.fullName || ''} ${farmer.farmerId || ''} ${farmer.phone || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [farmers, farmerQuery])

  const farmerPolicies = useMemo(() => {
    if (!farmerId) return []
    return policies.filter((policy) => String(policy.farmerId) === String(farmerId))
  }, [policies, farmerId])

  const activeFarmerPolicies = useMemo(
    () => farmerPolicies.filter((policy) => isCurrentlyActive(policy)),
    [farmerPolicies],
  )

  const selectedPolicy = useMemo(
    () => policies.find((policy) => String(policy.id) === String(policyId)) || null,
    [policies, policyId],
  )

  const insuranceHistory = useMemo(
    () => history.filter((row) => isInsurancePayment(row)),
    [history],
  )

  const successfulPremium = useMemo(
    () =>
      insuranceHistory
        .filter((row) => isSuccessful(row))
        .reduce((sum, row) => sum + Number(row.amount || 0), 0),
    [insuranceHistory],
  )

  const activePolicyCount = useMemo(
    () => policies.filter((policy) => isCurrentlyActive(policy)).length,
    [policies],
  )

  const onFarmerChange = (nextId) => {
    setFarmerId(nextId)
    setPolicyId('')
    setAmount('')
    const farmer = farmersById[String(nextId)]
    setPhoneNumber(farmer?.phone || farmer?.phoneNumber || '')
    const firstActive =
      policies.find(
        (policy) => String(policy.farmerId) === String(nextId) && isCurrentlyActive(policy),
      ) || policies.find((policy) => String(policy.farmerId) === String(nextId))
    if (firstActive) {
      setPolicyId(String(firstActive.id))
      if (firstActive.premium) setAmount(String(firstActive.premium))
    }
  }

  const onPolicyChange = (nextId) => {
    setPolicyId(nextId)
    const policy = policies.find((row) => String(row.id) === String(nextId))
    if (policy?.premium) setAmount(String(policy.premium))
  }

  const onCollect = async (event) => {
    event.preventDefault()
    if (!farmerId || !policyId) {
      toast.error('Select a farmer and policy.')
      return
    }
    if (!phoneNumber.trim()) {
      toast.error('Enter the farmer MoMo phone number.')
      return
    }
    if (!amount || Number(amount) <= 0) {
      toast.error('Enter a valid premium amount.')
      return
    }

    setSaving(true)
    try {
      const payment = await requestInsurancePayment({
        farmerId: Number(farmerId),
        insurancePolicyId: Number(policyId),
        amount: Number(amount),
        currency: 'RWF',
        phoneNumber: phoneNumber.trim(),
        provider,
        payerMessage:
          provider === 'AIRTEL_MONEY' ? 'Airtel Money insurance premium' : 'MTN MoMo insurance premium',
        payeeNote: 'AgriFinance Insurance',
      })
      toast.success(
        `Premium request ${payment.status}${
          payment.providerReference ? ` · ref ${payment.providerReference}` : ''
        }. Farmer should approve on phone.`,
      )
      const refreshed = await fetchPaymentHistoryWithRefresh(Number(farmerId)).catch(() => null)
      if (refreshed) {
        // Merge farmer-scoped refresh into full list
        const others = history.filter((row) => Number(row.farmerId) !== Number(farmerId))
        setHistory([...refreshed, ...others])
      } else {
        await load()
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Premium collection failed.')
    } finally {
      setSaving(false)
    }
  }

  const onRefreshPayment = async (paymentId) => {
    setBusyPaymentId(paymentId)
    try {
      await refreshPaymentStatus(paymentId)
      await load()
      toast.success('Payment status refreshed.')
    } catch {
      toast.error('Could not refresh payment status.')
    } finally {
      setBusyPaymentId(null)
    }
  }

  return (
    <section className="dashboard-page dashboard-page--compact insurance-payments-page">
      <PageHeader
        title="Payments"
        subtitle="Collect insurance premiums by MoMo and track policy payment activity."
        actions={
          <Link to="/insurance" className="btn-secondary">
            <ShieldCheck size={16} />
            Policies
          </Link>
        }
      />

      <div className="dash-alerts">
        <div className="dash-alert dash-alert--warn">
          <ShieldCheck size={18} />
          <span>
            <strong>Why this page matters:</strong> banks need active insured farmers. After you issue a
            policy, collect the premium here so cover stays valid and loans can be approved.
          </span>
        </div>
      </div>

      <div className="widgets four">
        <StatCard
          title="Active policies"
          value={loading ? '…' : String(activePolicyCount)}
          meta="Eligible for collection"
          accent="blue"
        />
        <StatCard
          title="Premium collected"
          value={loading ? '…' : formatRwfCompact(successfulPremium)}
          meta="Successful MoMo"
          accent="green"
        />
        <StatCard
          title="Collections"
          value={loading ? '…' : String(insuranceHistory.length)}
          meta="Insurance payments"
        />
        <StatCard
          title="Farmers"
          value={loading ? '…' : String(farmers.length)}
          meta="Available to bill"
          accent="slate"
        />
      </div>

      {loadError ? (
        <article className="card farmer-directory-alert">
          <p>{loadError}</p>
          <button type="button" className="btn-secondary" onClick={load}>
            Retry
          </button>
        </article>
      ) : null}

      <div className="dashboard-grid insurance-pay-grid">
        <form className="insurance-panel" onSubmit={onCollect}>
          <div className="insurance-panel__head">
            <div>
              <h2>Collect premium</h2>
              <p className="muted">Sends a MoMo prompt for the selected active policy.</p>
            </div>
          </div>

          <div className="insurance-panel__grid insurance-panel__grid--form">
            <label>
              Search farmers
              <input
                type="search"
                placeholder="Name, ID, or phone"
                value={farmerQuery}
                onChange={(event) => setFarmerQuery(event.target.value)}
              />
            </label>
            <label>
              Farmer
              <select
                value={farmerId}
                onChange={(event) => onFarmerChange(event.target.value)}
                required
                disabled={loading}
              >
                <option value="">Select farmer…</option>
                {filteredFarmers.map((farmer) => (
                  <option key={farmer.farmerId} value={farmer.farmerId}>
                    {formatDisplayName(farmer.fullName) || `Farmer #${farmer.farmerId}`} · #
                    {farmer.farmerId}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Policy
              <select
                value={policyId}
                onChange={(event) => onPolicyChange(event.target.value)}
                required
                disabled={!farmerId}
              >
                <option value="">Select policy…</option>
                {(activeFarmerPolicies.length ? activeFarmerPolicies : farmerPolicies).map((policy) => (
                  <option key={policy.id} value={policy.id}>
                    #{policy.id} · {policy.policyType} · {policy.status}
                    {policy.premium ? ` · ${formatRwf(policy.premium)}` : ''}
                  </option>
                ))}
              </select>
            </label>

            {farmerId && farmerPolicies.length === 0 ? (
              <p className="insurance-panel__hint muted">
                No policy for this farmer yet.{' '}
                <Link to={`/insurance?farmerId=${farmerId}`}>Issue a policy first</Link>.
              </p>
            ) : null}

            {selectedPolicy ? (
              <p className="insurance-panel__hint muted">
                Policy #{selectedPolicy.id} · {selectedPolicy.policyType} · valid{' '}
                {selectedPolicy.validFrom || '—'} → {selectedPolicy.validTo || '—'}
              </p>
            ) : null}

            <div className="momo-provider-row insurance-pay-providers" role="group" aria-label="Payment provider">
              {PROVIDERS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`momo-provider-btn${provider === option.value ? ' is-active' : ''}${
                    option.value === 'AIRTEL_MONEY'
                      ? ' momo-provider-btn--airtel'
                      : ' momo-provider-btn--mtn'
                  }`}
                  onClick={() => setProvider(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <label>
              Farmer phone
              <input
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder="078… or +250…"
                required
              />
            </label>
            <label>
              Amount (Rwf)
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Premium amount"
                required
              />
            </label>
            <button
              type="submit"
              className="btn-primary insurance-panel__submit"
              disabled={saving || !policyId}
            >
              {saving
                ? 'Sending prompt…'
                : provider === 'AIRTEL_MONEY'
                  ? 'Collect with Airtel Money'
                  : 'Collect with MTN MoMo'}
            </button>
          </div>
        </form>

        <DataTableShell
          title="Premium collections"
          filters={
            <button type="button" className="btn-secondary" onClick={load} disabled={loading}>
              <RefreshCw size={14} />
              Refresh
            </button>
          }
          footer={<span>{insuranceHistory.length} insurance payment(s)</span>}
        >
          <table className="desktop-table dashboard-table">
            <thead>
              <tr>
                <th>Farmer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Phone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5}>
                    <div className="skeleton-row" />
                  </td>
                </tr>
              ) : insuranceHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty-cell">
                    No premium collections yet. Issue a policy, then collect here.
                  </td>
                </tr>
              ) : (
                insuranceHistory.slice(0, 30).map((row) => {
                  const farmer = farmersById[String(row.farmerId)]
                  const pending = String(row.status || '').toUpperCase() === 'PENDING'
                  return (
                    <tr key={row.paymentId}>
                      <td>
                        <div className="farmer-cell">
                          <strong className="dash-name">
                            {formatDisplayName(farmer?.fullName) || `Farmer #${row.farmerId}`}
                          </strong>
                          <small>
                            #{row.paymentId}
                            {row.insurancePolicyId ? ` · Policy #${row.insurancePolicyId}` : ''}
                          </small>
                        </div>
                      </td>
                      <td>
                        {formatRwf(row.amount)} {row.currency || 'RWF'}
                      </td>
                      <td>
                        <StatusBadge value={row.status} />
                      </td>
                      <td>{row.phoneNumber || '—'}</td>
                      <td className="action-cell">
                        {pending ? (
                          <button
                            type="button"
                            className="btn-secondary"
                            disabled={busyPaymentId === row.paymentId}
                            onClick={() => onRefreshPayment(row.paymentId)}
                          >
                            {busyPaymentId === row.paymentId ? '…' : 'Refresh status'}
                          </button>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </DataTableShell>
      </div>
    </section>
  )
}
