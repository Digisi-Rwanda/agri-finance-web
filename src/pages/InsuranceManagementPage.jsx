import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Download, Plus, Search, ShieldCheck, X } from 'lucide-react'
import { toast } from 'react-toastify'
import { Link, useSearchParams } from 'react-router-dom'
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
import { usePageCopy } from '../context/AuthLocaleContext'

const STATUS_FILTER_VALUES = ['All', 'ACTIVE', 'PENDING', 'CLAIMED', 'EXPIRED']

const emptyForm = {
  farmerId: '',
  insurerId: '',
  policyType: 'crop',
  policyReference: '',
  premium: '',
  validFrom: '',
  validTo: '',
}

function localToday() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function plusYears(isoDate, years) {
  const [y, m, d] = String(isoDate).split('-').map(Number)
  return `${y + years}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function isCurrentlyActive(policy) {
  if (String(policy.status || '').toUpperCase() !== 'ACTIVE') return false
  const today = localToday()
  if (policy.validFrom && String(policy.validFrom) > today) return false
  if (policy.validTo && String(policy.validTo) < today) return false
  return true
}

function displayCoverageStatus(policy, p) {
  const status = String(policy.status || '').toUpperCase()
  if (status !== 'ACTIVE') return status || '—'
  const today = localToday()
  if (policy.validFrom && String(policy.validFrom) > today) return p.notYetValid
  if (policy.validTo && String(policy.validTo) < today) return p.coverageExpired
  return 'ACTIVE'
}

function defaultPolicyDates() {
  const from = localToday()
  return { validFrom: from, validTo: plusYears(from, 1) }
}

function InsuranceManagementPage() {
  const { s, p } = usePageCopy('insurance')
  const statusFilters = useMemo(
    () =>
      STATUS_FILTER_VALUES.map((value) => ({
        value,
        label:
          value === 'All'
            ? s.all
            : s.statuses[value] || value,
      })),
    [s.all, s.statuses],
  )
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
      setLoadError(err?.response?.data?.error || p.loadFailed)
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
    setForm((prev) => ({ ...prev, farmerId: String(farmerId), ...defaultPolicyDates() }))
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
      toast.error(p.enterInsurerName)
      return
    }
    setSaving(true)
    try {
      const created = await createInsurer({ insurerName: name })
      toast.success(p.insurerCreated(created.insurerName || name))
      setInsurerName('')
      setShowInsurerForm(false)
      const next = await getInsurers()
      setInsurers(next)
      updateForm({ insurerId: String(created.insurerId || next[0]?.insurerId || '') })
    } catch (err) {
      toast.error(err?.response?.data?.error || p.createInsurerFailed)
    } finally {
      setSaving(false)
    }
  }

  const handleCreatePolicy = async (event) => {
    event.preventDefault()
    if (!form.farmerId) {
      toast.error(p.selectFarmerError)
      return
    }
    if (!form.insurerId) {
      toast.error(p.selectInsurerError)
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
      toast.success(p.policyIssued)
      setShowCreate(false)
      setForm((prev) => ({
        ...emptyForm,
        ...defaultPolicyDates(),
        insurerId: prev.insurerId,
      }))
      await load()
    } catch (err) {
      toast.error(err?.response?.data?.error || p.createPolicyFailed)
    } finally {
      setSaving(false)
    }
  }

  const handleStatus = async (policyId, nextStatus) => {
    setBusyPolicyId(policyId)
    try {
      await updatePolicyStatus(policyId, nextStatus)
      toast.success(p.policyStatusUpdated(policyId, nextStatus))
      await load()
    } catch (err) {
      toast.error(err?.response?.data?.error || p.updatePolicyFailed)
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
      title: p.pdfTitle,
      subtitle: `${rows.length} polic${rows.length === 1 ? 'y' : 'ies'}`,
      filename: `${slugifyFilename('insurance-portfolio')}-report`,
      headers,
      rows,
    })
    toast.success(p.pdfDownloaded(rows.length))
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
            {busy ? s.saving : p.fileClaim}
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={busy}
            onClick={() => handleStatus(policy.id, 'EXPIRED')}
          >
            {p.expire}
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
          {busy ? s.saving : p.closeClaim}
        </button>
      )
    }
    if (status === 'PENDING') {
      return (
        <button
          type="button"
          className="btn-primary"
          disabled={busy}
          onClick={() => handleStatus(policy.id, 'ACTIVE')}
        >
          {busy ? s.saving : p.activate}
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
        {busy ? s.saving : p.reactivate}
      </button>
    )
  }

  return (
    <section className="dashboard-page dashboard-page--compact insurance-page">
      <PageHeader
        title={p.title}
        subtitle={p.subtitle}
        actions={
          <>
            <Link to="/payments" className="btn-secondary">
              {p.collectPremiums}
            </Link>
            <button type="button" className="btn-secondary" onClick={handleExportReport}>
              <Download size={16} aria-hidden />
              {s.exportPdf}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowInsurerForm((value) => !value)}
            >
              {showInsurerForm ? p.closeInsurer : p.addInsurer}
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setForm((prev) => ({
                  ...prev,
                  ...defaultPolicyDates(),
                  farmerId: prev.farmerId,
                  insurerId: prev.insurerId,
                }))
                setShowCreate((value) => !value)
              }}
            >
              <Plus size={16} aria-hidden />
              {showCreate ? p.closeForm : p.newPolicy}
            </button>
          </>
        }
      />

      {!loading && insurers.length === 0 ? (
        <div className="dash-alerts">
          <div className="dash-alert dash-alert--warn">
            <AlertCircle size={18} />
            <span>
              <strong>{p.noInsurer}</strong> {p.createInsurerFirst}
            </span>
            <button type="button" className="dash-alert__action" onClick={() => setShowInsurerForm(true)}>
              {p.addInsurer}
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
              <strong>{p.openClaims(claimedPolicies.length)}</strong>
            </span>
            <span className="dash-alert__action">{p.filterClaimed}</span>
          </button>
        </div>
      ) : null}

      <div className="widgets four">
        <StatCard title={p.policies} value={loading ? '…' : String(policies.length)} meta={p.policiesMeta} />
        <StatCard
          title={p.active}
          value={loading ? '…' : String(activePolicies.length)}
          meta={p.activeMeta}
          accent="blue"
        />
        <StatCard
          title={p.openClaimsStat}
          value={loading ? '…' : String(claimedPolicies.length)}
          meta={p.expiredMeta(expiredPolicies.length)}
          accent="amber"
        />
        <StatCard
          title={p.activePremium}
          value={loading ? '…' : formatRwfCompact(totalPremiumValue)}
          meta={p.activePremiumMeta}
          accent="slate"
        />
      </div>

      {showInsurerForm ? (
        <form className="insurance-panel" onSubmit={handleCreateInsurer}>
          <div className="insurance-panel__head">
            <div>
              <h2>{p.addInsurerTitle}</h2>
              <p className="muted">{p.addInsurerDesc}</p>
            </div>
            <button type="button" className="btn-secondary" onClick={() => setShowInsurerForm(false)}>
              <X size={14} />
              {s.close}
            </button>
          </div>
          <div className="insurance-panel__grid">
            <label>
              {p.insurerName}
              <input
                value={insurerName}
                onChange={(event) => setInsurerName(event.target.value)}
                placeholder="e.g. SONARWA Agri Cover"
                required
              />
            </label>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? s.saving : p.saveInsurer}
            </button>
          </div>
        </form>
      ) : null}

      {showCreate ? (
        <form className="insurance-panel" onSubmit={handleCreatePolicy}>
          <div className="insurance-panel__head">
            <div>
              <h2>{p.issuePolicyTitle}</h2>
              <p className="muted">{p.issuePolicyDesc}</p>
            </div>
            <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>
              <X size={14} />
              {s.close}
            </button>
          </div>
          <div className="insurance-panel__grid insurance-panel__grid--form">
            <label>
              {p.farmer}
              <select
                value={form.farmerId}
                onChange={(event) => updateForm({ farmerId: event.target.value })}
                required
              >
                <option value="">{p.selectFarmer}</option>
                {farmers.map((farmer) => (
                  <option key={farmer.farmerId} value={farmer.farmerId}>
                    {farmer.fullName || `Farmer #${farmer.farmerId}`} (#{farmer.farmerId})
                  </option>
                ))}
              </select>
            </label>
            <label>
              {p.insurer}
              <select
                value={form.insurerId}
                onChange={(event) => updateForm({ insurerId: event.target.value })}
                required
              >
                <option value="">{p.selectInsurer}</option>
                {insurers.map((insurer) => (
                  <option key={insurer.insurerId} value={insurer.insurerId}>
                    {insurer.insurerName || insurer.name || `Insurer #${insurer.insurerId}`}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {p.policyType}
              <select
                value={form.policyType}
                onChange={(event) => updateForm({ policyType: event.target.value })}
              >
                <option value="crop">{p.types.crop}</option>
                <option value="livestock">{p.types.livestock}</option>
                <option value="equipment">{p.types.equipment}</option>
                <option value="multi-peril">{p.types['multi-peril']}</option>
              </select>
            </label>
            <label>
              {p.reference}
              <input
                value={form.policyReference}
                onChange={(event) => updateForm({ policyReference: event.target.value })}
                placeholder={p.optionalRef}
              />
            </label>
            <label>
              {p.premiumRwf}
              <input
                type="number"
                min="0"
                value={form.premium}
                onChange={(event) => updateForm({ premium: event.target.value })}
                placeholder="0"
              />
            </label>
            <label>
              {p.validFrom}
              <input
                type="date"
                value={form.validFrom}
                onChange={(event) => updateForm({ validFrom: event.target.value })}
              />
            </label>
            <label>
              {p.validTo}
              <input
                type="date"
                value={form.validTo}
                onChange={(event) => updateForm({ validTo: event.target.value })}
              />
            </label>
            <div className="insurance-panel__hint muted">{p.dateHint}</div>
            <button type="submit" className="btn-primary insurance-panel__submit" disabled={saving}>
              {saving ? s.saving : p.issuePolicy}
            </button>
          </div>
        </form>
      ) : null}

      {loadError ? (
        <article className="card farmer-directory-alert">
          <p>{loadError}</p>
          <button type="button" className="btn-secondary" onClick={load}>
            {s.tryAgain}
          </button>
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
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
            </label>
            <div className="loan-filters__chips" role="group" aria-label="Status filter">
              {statusFilters.map((option) => (
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
                {s.clearFilters}
              </button>
            )}
          </div>
        }
        footer={
          <span>{p.showing(filteredPolicies.length, policies.length)}</span>
        }
      >
        <table className="desktop-table dashboard-table">
          <thead>
            <tr>
              <th>{p.colFarmer}</th>
              <th>{p.colType}</th>
              <th>{p.colPremium}</th>
              <th>{p.colValidity}</th>
              <th>{p.colStatus}</th>
              <th>{p.colActions}</th>
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
                  {policies.length === 0 ? p.empty : p.emptyFilter}
                </td>
              </tr>
            ) : (
              filteredPolicies.map((policy) => (
                <tr key={policy.id}>
                  <td>
                    <div className="farmer-cell">
                      <strong className="dash-name">{policy.farmer}</strong>
                      <small>
                        Farmer #{policy.farmerId} · Policy #{policy.id}
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
                    <StatusBadge value={displayCoverageStatus(policy, p)} />
                  </td>
                  <td className="action-cell">
                    <div className="insurance-actions">{renderActions(policy)}</div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="mobile-loan-list" aria-label={p.mobileListLabel}>
          {loading ? (
            <div className="skeleton-row" />
          ) : filteredPolicies.length === 0 ? (
            <p className="empty-cell">
              {policies.length === 0 ? p.empty : p.emptyFilter}
            </p>
          ) : (
            filteredPolicies.map((policy) => (
              <article key={`mobile-${policy.id}`} className="loan-mobile-card">
                <div className="loan-mobile-card__head">
                    <div>
                      <strong>{policy.farmer}</strong>
                      <small>
                        Farmer #{policy.farmerId} · Policy #{policy.id}
                      </small>
                    </div>
                    <StatusBadge value={displayCoverageStatus(policy, p)} />
                </div>
                <div className="loan-mobile-card__meta">
                  <div>
                    <span>{p.colType}</span>
                    {policy.policyType}
                  </div>
                  <div>
                    <span>{p.colPremium}</span>
                    {formatRwf(policy.premium)}
                  </div>
                  <div>
                    <span>{p.colValid}</span>
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
