import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Download, Plus, Search, ShieldCheck, X } from 'lucide-react'
import { toast } from 'react-toastify'
import { useSearchParams } from 'react-router-dom'
import DataTableShell from '../components/ui/DataTableShell'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import {
  createInsurer,
  createPolicy,
  getInsurers,
  getPolicies,
  listFarmersForInsurance,
  updatePolicyStatus,
} from '../services/insuranceService'
import { formatRwf, formatRwfCompact } from '../utils/currency'
import { exportTableReport, slugifyFilename } from '../utils/exportPdf'

const STATUS_FILTERS = [
  { value: 'All', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'CLAIMED', label: 'Claimed' },
  { value: 'EXPIRED', label: 'Expired' },
]

const emptyForm = {
  farmerId: '',
  insurerId: '',
  policyType: 'crop',
  policyReference: '',
  premium: '',
  validFrom: '',
  validTo: '',
}

function isCurrentlyActive(policy) {
  if (String(policy.status || '').toUpperCase() !== 'ACTIVE') return false
  const today = new Date().toISOString().slice(0, 10)
  if (policy.validFrom && String(policy.validFrom) > today) return false
  if (policy.validTo && String(policy.validTo) < today) return false
  return true
}

function InsuranceManagementPage() {
  const [searchParams] = useSearchParams()
  const [policies, setPolicies] = useState([])
  const [insurers, setInsurers] = useState([])
  const [farmers, setFarmers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [busyPolicyId, setBusyPolicyId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showInsurerForm, setShowInsurerForm] = useState(false)
  const [insurerName, setInsurerName] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [form, setForm] = useState(emptyForm)

  const load = async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [policyRows, insurerList, farmerList] = await Promise.all([
        getPolicies(),
        getInsurers().catch(() => []),
        listFarmersForInsurance().catch(() => []),
      ])
      setPolicies(Array.isArray(policyRows) ? policyRows : [])
      const nextInsurers = Array.isArray(insurerList) ? insurerList : []
      setInsurers(nextInsurers)
      setFarmers(Array.isArray(farmerList) ? farmerList : [])
      setForm((prev) => ({
        ...prev,
        insurerId: prev.insurerId || (nextInsurers[0] ? String(nextInsurers[0].insurerId) : ''),
      }))
      if (nextInsurers.length === 0) setShowInsurerForm(true)
    } catch (err) {
      setLoadError(err?.response?.data?.error || 'Could not load insurance policies.')
      setPolicies([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    const farmerId = searchParams.get('farmerId')
    if (!farmerId) return
    setForm((prev) => ({ ...prev, farmerId: String(farmerId) }))
    setShowCreate(true)
  }, [searchParams])

  const activePolicies = useMemo(() => policies.filter((policy) => isCurrentlyActive(policy)), [policies])
  const claimedPolicies = useMemo(
    () => policies.filter((policy) => String(policy.status).toUpperCase() === 'CLAIMED'),
    [policies],
  )
  const expiredPolicies = useMemo(
    () => policies.filter((policy) => String(policy.status).toUpperCase() === 'EXPIRED'),
    [policies],
  )
  const totalPremiumValue = useMemo(
    () => activePolicies.reduce((sum, policy) => sum + Number(policy.premium || 0), 0),
    [activePolicies],
  )

  const filteredPolicies = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return policies.filter((policy) => {
      const statusOk = statusFilter === 'All' || String(policy.status).toUpperCase() === statusFilter
      const searchOk =
        !query ||
        policy.farmer?.toLowerCase().includes(query) ||
        String(policy.farmerId).includes(query) ||
        String(policy.id).includes(query) ||
        policy.policyType?.toLowerCase().includes(query) ||
        policy.policyReference?.toLowerCase().includes(query)
      return statusOk && searchOk
    })
  }, [policies, searchQuery, statusFilter])

  const updateForm = (patch) => setForm((prev) => ({ ...prev, ...patch }))

  const handleCreateInsurer = async (event) => {
    event.preventDefault()
    const name = insurerName.trim()
    if (!name) {
      toast.error('Enter an insurer name.')
      return
    }
    setSaving(true)
    try {
      const created = await createInsurer({ insurerName: name })
      toast.success(`Insurer “${created.insurerName || name}” created.`)
      setInsurerName('')
      setShowInsurerForm(false)
      const next = await getInsurers()
      setInsurers(next)
      updateForm({ insurerId: String(created.insurerId || next[0]?.insurerId || '') })
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Could not create insurer.')
    } finally {
      setSaving(false)
    }
  }

  const handleCreatePolicy = async (event) => {
    event.preventDefault()
    if (!form.farmerId) {
      toast.error('Select a farmer.')
      return
    }
    if (!form.insurerId) {
      toast.error('Select or create an insurer first.')
      setShowInsurerForm(true)
      return
    }
    setSaving(true)
    try {
      await createPolicy({
        farmerId: Number(form.farmerId),
        insurerId: Number(form.insurerId),
        policyType: form.policyType || 'crop',
        policyReference: form.policyReference || null,
        premium: form.premium ? Number(form.premium) : null,
        status: 'ACTIVE',
        validFrom: form.validFrom || null,
        validTo: form.validTo || null,
      })
      toast.success('Active policy issued — bank can approve loans for this farmer.')
      setShowCreate(false)
      setForm((prev) => ({
        ...emptyForm,
        insurerId: prev.insurerId,
      }))
      await load()
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Could not create policy.')
    } finally {
      setSaving(false)
    }
  }

  const handleStatus = async (policyId, nextStatus) => {
    setBusyPolicyId(policyId)
    try {
      await updatePolicyStatus(policyId, nextStatus)
      toast.success(`Policy #${policyId} marked ${nextStatus}.`)
      await load()
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Could not update policy status.')
    } finally {
      setBusyPolicyId(null)
    }
  }

  const handleExportReport = () => {
    const headers = [
      { key: 'id', label: 'Policy ID' },
      { key: 'farmer', label: 'Farmer' },
      { key: 'farmerId', label: 'Farmer ID' },
      { key: 'policyType', label: 'Policy type' },
      { key: 'policyReference', label: 'Reference' },
      { key: 'premium', label: 'Premium (Rwf)' },
      { key: 'status', label: 'Status' },
      { key: 'validFrom', label: 'Valid from' },
      { key: 'validTo', label: 'Valid to' },
      { key: 'insurerId', label: 'Insurer ID' },
    ]
    const rows = filteredPolicies.map((policy) => ({
      id: policy.id,
      farmer: policy.farmer,
      farmerId: policy.farmerId,
      policyType: policy.policyType,
      policyReference: policy.policyReference || '—',
      premium: policy.premium,
      status: policy.status,
      validFrom: policy.validFrom || '—',
      validTo: policy.validTo || '—',
      insurerId: policy.insurerId ?? '',
    }))
    exportTableReport({
      title: 'Insurance Portfolio Report',
      subtitle: `${rows.length} polic${rows.length === 1 ? 'y' : 'ies'}`,
      filename: `${slugifyFilename('insurance-portfolio')}-report`,
      headers,
      rows,
    })
    toast.success(`Downloaded PDF with ${rows.length} polic${rows.length === 1 ? 'y' : 'ies'}.`)
  }

  const renderActions = (policy) => {
    const status = String(policy.status || '').toUpperCase()
    const busy = busyPolicyId === policy.id
    if (status === 'ACTIVE') {
      return (
        <>
          <button
            type="button"
            className="btn-secondary danger"
            disabled={busy}
            onClick={() => handleStatus(policy.id, 'CLAIMED')}
          >
            {busy ? 'Saving…' : 'File claim'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={busy}
            onClick={() => handleStatus(policy.id, 'EXPIRED')}
          >
            Expire
          </button>
        </>
      )
    }
    if (status === 'CLAIMED') {
      return (
        <button
          type="button"
          className="btn-secondary"
          disabled={busy}
          onClick={() => handleStatus(policy.id, 'EXPIRED')}
        >
          {busy ? 'Saving…' : 'Close claim'}
        </button>
      )
    }
    return (
      <button
        type="button"
        className="btn-primary"
        disabled={busy}
        onClick={() => handleStatus(policy.id, 'ACTIVE')}
      >
        {busy ? 'Saving…' : 'Reactivate'}
      </button>
    )
  }

  return (
    <section className="dashboard-page dashboard-page--compact insurance-page">
      <PageHeader
        breadcrumb="Home › Insurance"
        title="Insurance"
        subtitle="Issue active crop policies, manage claims, and keep farmers bankable."
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={handleExportReport}>
              <Download size={16} aria-hidden />
              Export PDF
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowInsurerForm((value) => !value)}
            >
              {showInsurerForm ? 'Close insurer' : 'Add insurer'}
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setShowCreate((value) => !value)}
            >
              <Plus size={16} aria-hidden />
              {showCreate ? 'Close form' : 'New policy'}
            </button>
          </>
        }
      />

      {!loading && insurers.length === 0 ? (
        <div className="dash-alerts">
          <div className="dash-alert dash-alert--warn">
            <AlertCircle size={18} />
            <span>
              <strong>No insurer on file.</strong> Create an insurer before issuing policies.
            </span>
            <button type="button" className="dash-alert__action" onClick={() => setShowInsurerForm(true)}>
              Add insurer
            </button>
          </div>
        </div>
      ) : null}

      {!loading && claimedPolicies.length > 0 ? (
        <div className="dash-alerts">
          <button
            type="button"
            className="dash-alert dash-alert--risk"
            onClick={() => setStatusFilter('CLAIMED')}
          >
            <ShieldCheck size={18} />
            <span>
              <strong>
                {claimedPolicies.length} open claim{claimedPolicies.length === 1 ? '' : 's'}
              </strong>{' '}
              need review
            </span>
            <span className="dash-alert__action">Filter claimed</span>
          </button>
        </div>
      ) : null}

      <div className="widgets four">
        <StatCard title="Policies" value={loading ? '…' : String(policies.length)} meta="All statuses" />
        <StatCard
          title="Active"
          value={loading ? '…' : String(activePolicies.length)}
          meta="Valid cover"
          accent="blue"
        />
        <StatCard
          title="Open claims"
          value={loading ? '…' : String(claimedPolicies.length)}
          meta={`${expiredPolicies.length} expired`}
          accent="amber"
        />
        <StatCard
          title="Active premium"
          value={loading ? '…' : formatRwfCompact(totalPremiumValue)}
          meta="On active policies"
          accent="slate"
        />
      </div>

      {showInsurerForm ? (
        <form className="insurance-panel" onSubmit={handleCreateInsurer}>
          <div className="insurance-panel__head">
            <div>
              <h2>Add insurer</h2>
              <p className="muted">Required before issuing policies to farmers.</p>
            </div>
            <button type="button" className="btn-secondary" onClick={() => setShowInsurerForm(false)}>
              <X size={14} />
              Close
            </button>
          </div>
          <div className="insurance-panel__grid">
            <label>
              Insurer name
              <input
                value={insurerName}
                onChange={(event) => setInsurerName(event.target.value)}
                placeholder="e.g. SONARWA Agri Cover"
                required
              />
            </label>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save insurer'}
            </button>
          </div>
        </form>
      ) : null}

      {showCreate ? (
        <form className="insurance-panel" onSubmit={handleCreatePolicy}>
          <div className="insurance-panel__head">
            <div>
              <h2>Issue policy</h2>
              <p className="muted">Creates an ACTIVE policy banks can rely on for loan approval.</p>
            </div>
            <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>
              <X size={14} />
              Close
            </button>
          </div>
          <div className="insurance-panel__grid insurance-panel__grid--form">
            <label>
              Farmer
              <select
                value={form.farmerId}
                onChange={(event) => updateForm({ farmerId: event.target.value })}
                required
              >
                <option value="">Select farmer…</option>
                {farmers.map((farmer) => (
                  <option key={farmer.farmerId} value={farmer.farmerId}>
                    {farmer.fullName || `Farmer #${farmer.farmerId}`} (#{farmer.farmerId})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Insurer
              <select
                value={form.insurerId}
                onChange={(event) => updateForm({ insurerId: event.target.value })}
                required
              >
                <option value="">Select insurer…</option>
                {insurers.map((insurer) => (
                  <option key={insurer.insurerId} value={insurer.insurerId}>
                    {insurer.insurerName || insurer.name || `Insurer #${insurer.insurerId}`}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Policy type
              <select
                value={form.policyType}
                onChange={(event) => updateForm({ policyType: event.target.value })}
              >
                <option value="crop">Crop</option>
                <option value="livestock">Livestock</option>
                <option value="equipment">Equipment</option>
                <option value="multi-peril">Multi-peril</option>
              </select>
            </label>
            <label>
              Reference
              <input
                value={form.policyReference}
                onChange={(event) => updateForm({ policyReference: event.target.value })}
                placeholder="Optional policy ref"
              />
            </label>
            <label>
              Premium (Rwf)
              <input
                type="number"
                min="0"
                value={form.premium}
                onChange={(event) => updateForm({ premium: event.target.value })}
                placeholder="0"
              />
            </label>
            <label>
              Valid from
              <input
                type="date"
                value={form.validFrom}
                onChange={(event) => updateForm({ validFrom: event.target.value })}
              />
            </label>
            <label>
              Valid to
              <input
                type="date"
                value={form.validTo}
                onChange={(event) => updateForm({ validTo: event.target.value })}
              />
            </label>
            <div className="insurance-panel__hint muted">
              Leave dates empty to default to today → one year.
            </div>
            <button type="submit" className="btn-primary insurance-panel__submit" disabled={saving}>
              {saving ? 'Issuing…' : 'Issue active policy'}
            </button>
          </div>
        </form>
      ) : null}

      {loadError ? (
        <article className="card farmer-directory-alert">
          <p>{loadError}</p>
          <button type="button" className="btn-secondary" onClick={load}>
            Retry
          </button>
        </article>
      ) : null}

      <DataTableShell
        title="Policies"
        filters={
          <div className="loan-filters">
            <label className="filter-search loan-filters__search">
              <span>Search</span>
              <div className="filter-search__field">
                <Search size={14} aria-hidden />
                <input
                  type="search"
                  placeholder="Farmer, policy ID, type, or reference"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
            </label>
            <div className="loan-filters__chips" role="group" aria-label="Status filter">
              {STATUS_FILTERS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`filter-chip${statusFilter === option.value ? ' filter-chip--active' : ''}`}
                  onClick={() => setStatusFilter(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {(searchQuery || statusFilter !== 'All') && (
              <button
                type="button"
                className="btn-secondary loan-filters__clear"
                onClick={() => {
                  setSearchQuery('')
                  setStatusFilter('All')
                }}
              >
                <X size={14} />
                Clear filters
              </button>
            )}
          </div>
        }
        footer={
          <span>
            Showing {filteredPolicies.length} of {policies.length} polic
            {policies.length === 1 ? 'y' : 'ies'}
          </span>
        }
      >
        <table className="desktop-table dashboard-table">
          <thead>
            <tr>
              <th>Farmer</th>
              <th>Type</th>
              <th>Premium</th>
              <th>Validity</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(4)].map((_, index) => (
                <tr key={`sk-${index}`}>
                  <td colSpan={6}>
                    <div className="skeleton-row" />
                  </td>
                </tr>
              ))
            ) : filteredPolicies.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-cell">
                  {policies.length === 0
                    ? 'No policies yet. Issue the first active policy above.'
                    : 'No policies match your filters.'}
                </td>
              </tr>
            ) : (
              filteredPolicies.map((policy) => (
                <tr key={policy.id}>
                  <td>
                    <div className="farmer-cell">
                      <strong className="dash-name">{policy.farmer}</strong>
                      <small>
                        Policy #{policy.id}
                        {policy.policyReference ? ` · ${policy.policyReference}` : ''}
                      </small>
                    </div>
                  </td>
                  <td>{policy.policyType}</td>
                  <td>{formatRwf(policy.premium)}</td>
                  <td>
                    <small>
                      {policy.validFrom || '—'} → {policy.validTo || '—'}
                    </small>
                  </td>
                  <td>
                    <StatusBadge value={policy.status} />
                  </td>
                  <td className="action-cell">
                    <div className="insurance-actions">{renderActions(policy)}</div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="mobile-loan-list" aria-label="Insurance policies">
          {loading ? (
            <div className="skeleton-row" />
          ) : filteredPolicies.length === 0 ? (
            <p className="empty-cell">
              {policies.length === 0
                ? 'No policies yet. Issue the first active policy above.'
                : 'No policies match your filters.'}
            </p>
          ) : (
            filteredPolicies.map((policy) => (
              <article key={`mobile-${policy.id}`} className="loan-mobile-card">
                <div className="loan-mobile-card__head">
                  <div>
                    <strong>{policy.farmer}</strong>
                    <small>Policy #{policy.id}</small>
                  </div>
                  <StatusBadge value={policy.status} />
                </div>
                <div className="loan-mobile-card__meta">
                  <div>
                    <span>Type</span>
                    {policy.policyType}
                  </div>
                  <div>
                    <span>Premium</span>
                    {formatRwf(policy.premium)}
                  </div>
                  <div>
                    <span>Valid</span>
                    {policy.validFrom || '—'} → {policy.validTo || '—'}
                  </div>
                </div>
                <div className="loan-mobile-card__actions insurance-actions">{renderActions(policy)}</div>
              </article>
            ))
          )}
        </div>
      </DataTableShell>
    </section>
  )
}

export default InsuranceManagementPage
