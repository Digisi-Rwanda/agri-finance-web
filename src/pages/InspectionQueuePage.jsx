import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import {
  createInspection,
  decideInspection,
  listContracts,
  listInspections,
  listInspectors,
  updateInspection,
  uploadInspectionEvidence,
} from '../services/bankabilityService'
import { getCurrentUser } from '../services/auth'

/**
 * Digisi field inspection queue (web).
 * Clear steps: open case → record visit → approve or reject.
 */
function InspectionQueuePage() {
  const [queue, setQueue] = useState([])
  const [contracts, setContracts] = useState([])
  const [inspectors, setInspectors] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  const [selectedId, setSelectedId] = useState(null)
  const [notes, setNotes] = useState('')
  const [scheduleDate, setScheduleDate] = useState('')
  const [inspectorId, setInspectorId] = useState('')
  const [evidenceFile, setEvidenceFile] = useState(null)

  const workPanelRef = useRef(null)

  const defaultSchedule = () => new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)

  const load = async () => {
    setLoading(true)
    try {
      const [pending, allContracts, staff] = await Promise.all([
        listInspections('pending'),
        listContracts(),
        listInspectors().catch(() => []),
      ])
      setQueue(Array.isArray(pending) ? pending : [])
      setContracts(Array.isArray(allContracts) ? allContracts : [])
      setInspectors(Array.isArray(staff) ? staff : [])
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to load inspection queue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const contractById = useMemo(() => {
    const map = new Map()
    contracts.forEach((c) => map.set(Number(c.contractId), c))
    return map
  }, [contracts])

  const openCaseIds = useMemo(
    () => new Set(queue.map((row) => Number(row.contractId))),
    [queue],
  )

  const pendingContracts = useMemo(
    () =>
      contracts.filter(
        (c) =>
          String(c.status || '').toLowerCase() === 'field_inspection_pending' &&
          !openCaseIds.has(Number(c.contractId)),
      ),
    [contracts, openCaseIds],
  )

  const selectedCase = queue.find((row) => row.inspectionId === selectedId) || null
  const selectedContract = selectedCase
    ? contractById.get(Number(selectedCase.contractId))
    : null

  const inspectorName = (id) => {
    if (!id) return 'Unassigned'
    const u = inspectors.find((i) => Number(i.userId) === Number(id))
    return u ? u.username : `Inspector #${id}`
  }

  const formatValue = (value) => {
    if (value == null || value === '') return '—'
    const n = Number(value)
    if (Number.isFinite(n)) return `${n.toLocaleString()} Rwf`
    return String(value)
  }

  const openWorkPanel = (row) => {
    setSelectedId(row.inspectionId)
    setNotes(row.visitNotes || '')
    setScheduleDate(row.scheduledDate || defaultSchedule())
    setInspectorId(row.assignedInspectorId ? String(row.assignedInspectorId) : '')
    setEvidenceFile(null)
    window.setTimeout(() => {
      workPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  const closeWorkPanel = () => {
    setSelectedId(null)
    setNotes('')
    setEvidenceFile(null)
  }

  const openCase = async (contractId) => {
    setBusyId(`open-${contractId}`)
    try {
      const created = await createInspection({
        contractId,
        scheduledDate: scheduleDate || defaultSchedule(),
        assignedInspectorId: inspectorId ? Number(inspectorId) : null,
        outcome: 'pending',
      })
      toast.success(`Inspection case #${created.inspectionId || ''} opened`)
      await load()
      if (created?.inspectionId) {
        openWorkPanel({
          ...created,
          scheduledDate: created.scheduledDate || scheduleDate || defaultSchedule(),
          assignedInspectorId: created.assignedInspectorId || (inspectorId ? Number(inspectorId) : null),
        })
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Could not open inspection case')
    } finally {
      setBusyId(null)
    }
  }

  const saveVisit = async () => {
    if (!selectedId) return
    setBusyId(`save-${selectedId}`)
    try {
      await updateInspection(selectedId, {
        visitNotes: notes,
        scheduledDate: scheduleDate || undefined,
        assignedInspectorId: inspectorId ? Number(inspectorId) : undefined,
      })
      if (evidenceFile) {
        await uploadInspectionEvidence(selectedId, evidenceFile)
        setEvidenceFile(null)
      }
      toast.success('Visit details saved')
      await load()
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Could not save visit')
    } finally {
      setBusyId(null)
    }
  }

  const decide = async (id, outcome) => {
    const label = outcome === 'approved' ? 'approve & verify' : 'reject & dispute'
    if (!window.confirm(`Are you sure you want to ${label} this contract?`)) return

    setBusyId(`decide-${id}-${outcome}`)
    try {
      const user = getCurrentUser()
      await decideInspection(id, outcome, user?.userId || user?.id || null)
      toast.success(outcome === 'approved' ? 'Contract verified' : 'Contract disputed')
      if (selectedId === id) closeWorkPanel()
      await load()
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Decision failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="dashboard-page inspection-page">
      <PageHeader
        breadcrumb="Bankability › Field inspections"
        title="Field inspection queue"
        subtitle="Open a case, visit the farm, upload evidence, then approve or reject."
        actions={
          <button type="button" className="btn-primary" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />

      <div className="widgets four">
        <StatCard title="Active cases" value={String(queue.length)} meta="Open visits" />
        <StatCard
          title="Need a case"
          value={String(pendingContracts.length)}
          meta="Buyer done — waiting to open"
        />
        <StatCard title="Inspectors" value={String(inspectors.length)} />
        <StatCard
          title="Verified contracts"
          value={String(contracts.filter((c) => c.status === 'verified').length)}
        />
      </div>

      <div className="inspection-guide">
        <p className="inspection-guide__title">How this page works</p>
        <ol>
          <li>
            <strong>Step 1 — Open a case</strong> for each contract waiting after buyer OTP.
          </li>
          <li>
            <strong>Step 2 — Work the visit</strong>: assign inspector, set date, add notes &amp; photo.
          </li>
          <li>
            <strong>Step 3 — Decide</strong>: Approve (contract verified) or Reject (disputed).
          </li>
        </ol>
      </div>

      <div className="inspection-defaults">
        <p className="inspection-defaults__label">Defaults used when you open a new case</p>
        <div className="inspection-defaults__row">
          <label>
            Visit date
            <input
              type="date"
              value={scheduleDate || defaultSchedule()}
              onChange={(e) => setScheduleDate(e.target.value)}
            />
          </label>
          <label>
            Assign inspector
            <select value={inspectorId} onChange={(e) => setInspectorId(e.target.value)}>
              <option value="">Unassigned</option>
              {inspectors.map((i) => (
                <option key={i.userId} value={i.userId}>
                  {i.username}
                  {i.role ? ` (${i.role})` : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
        {inspectors.length === 0 ? (
          <p className="inspection-hint">
            No inspector accounts found. Ask Admin to create a user with role INSPECTOR (or use Admin).
          </p>
        ) : null}
      </div>

      {selectedCase ? (
        <div className="inspection-work" ref={workPanelRef}>
          <div className="inspection-work__head">
            <div>
              <p className="inspection-work__eyebrow">Working on visit</p>
              <h2>
                Case #{selectedCase.inspectionId} · Contract #{selectedCase.contractId}
              </h2>
              {selectedContract ? (
                <p className="inspection-work__meta">
                  {selectedContract.buyerName || 'Buyer'} · {formatValue(selectedContract.contractValue)} · qty{' '}
                  {selectedContract.quantity ?? '—'}
                </p>
              ) : null}
            </div>
            <button type="button" className="btn-secondary" onClick={closeWorkPanel}>
              Close panel
            </button>
          </div>

          <div className="inspection-work__grid">
            <label>
              Visit notes
              <textarea
                rows={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What did you see on the farm? Crop condition, quantity match, any issues…"
              />
            </label>

            <div className="inspection-work__side">
              <label>
                Scheduled date
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                />
              </label>
              <label>
                Inspector
                <select value={inspectorId} onChange={(e) => setInspectorId(e.target.value)}>
                  <option value="">Unassigned</option>
                  {inspectors.map((i) => (
                    <option key={i.userId} value={i.userId}>
                      {i.username}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Evidence (photo or PDF)
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                />
                {evidenceFile ? (
                  <span className="inspection-file-name">{evidenceFile.name}</span>
                ) : selectedCase.evidenceUrls ? (
                  <span className="inspection-file-name">Saved: {selectedCase.evidenceUrls}</span>
                ) : (
                  <span className="inspection-hint">No evidence uploaded yet</span>
                )}
              </label>
            </div>
          </div>

          <div className="inspection-work__actions">
            <button
              type="button"
              className="btn-primary"
              disabled={busyId === `save-${selectedId}`}
              onClick={saveVisit}
            >
              {busyId === `save-${selectedId}` ? 'Saving…' : 'Save visit details'}
            </button>
            <button
              type="button"
              className="btn-primary inspection-btn-approve"
              disabled={Boolean(busyId)}
              onClick={() => decide(selectedId, 'approved')}
            >
              Approve &amp; verify contract
            </button>
            <button
              type="button"
              className="btn-danger"
              disabled={Boolean(busyId)}
              onClick={() => decide(selectedId, 'rejected')}
            >
              Reject / dispute
            </button>
          </div>
        </div>
      ) : null}

      <section className="inspection-section">
        <div className="inspection-section__head">
          <h2>Step 1 — Contracts waiting for a case</h2>
          <p>Buyer OTP is done. Open an inspection case to schedule the field visit.</p>
        </div>

        {pendingContracts.length === 0 ? (
          <div className="inspection-empty">
            {loading
              ? 'Loading…'
              : 'No new contracts waiting. If a visit is already open, use Step 2 below.'}
          </div>
        ) : (
          <div className="inspection-card-list">
            {pendingContracts.map((c) => (
              <article key={c.contractId} className="inspection-card">
                <div className="inspection-card__main">
                  <div className="inspection-card__title-row">
                    <h3>Contract #{c.contractId}</h3>
                    <StatusBadge status={c.status} />
                  </div>
                  <dl className="inspection-card__facts">
                    <div>
                      <dt>Buyer</dt>
                      <dd>{c.buyerName || '—'}</dd>
                    </div>
                    <div>
                      <dt>Value</dt>
                      <dd>{formatValue(c.contractValue)}</dd>
                    </div>
                    <div>
                      <dt>Quantity</dt>
                      <dd>{c.quantity ?? '—'}</dd>
                    </div>
                  </dl>
                </div>
                <div className="inspection-card__actions">
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={busyId === `open-${c.contractId}`}
                    onClick={() => openCase(c.contractId)}
                  >
                    {busyId === `open-${c.contractId}` ? 'Opening…' : 'Open inspection case'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="inspection-section">
        <div className="inspection-section__head">
          <h2>Step 2 — Active inspection cases</h2>
          <p>Click Work on visit — the edit panel opens above with notes, evidence, Approve and Reject.</p>
        </div>

        {queue.length === 0 ? (
          <div className="inspection-empty">
            {loading ? 'Loading…' : 'No active cases. Open one from Step 1 when a contract is waiting.'}
          </div>
        ) : (
          <div className="inspection-card-list">
            {queue.map((row) => {
              const contract = contractById.get(Number(row.contractId))
              const isActive = selectedId === row.inspectionId
              return (
                <article
                  key={row.inspectionId}
                  className={`inspection-card${isActive ? ' is-active' : ''}`}
                >
                  <div className="inspection-card__main">
                    <div className="inspection-card__title-row">
                      <h3>
                        Case #{row.inspectionId}
                        <span className="inspection-card__sub"> · Contract #{row.contractId}</span>
                      </h3>
                      <StatusBadge status="pending" />
                    </div>
                    <dl className="inspection-card__facts">
                      <div>
                        <dt>Buyer</dt>
                        <dd>{contract?.buyerName || '—'}</dd>
                      </div>
                      <div>
                        <dt>Inspector</dt>
                        <dd>{inspectorName(row.assignedInspectorId)}</dd>
                      </div>
                      <div>
                        <dt>Scheduled</dt>
                        <dd>{row.scheduledDate || 'Not set'}</dd>
                      </div>
                      <div>
                        <dt>Evidence</dt>
                        <dd>{row.evidenceUrls ? 'Uploaded' : 'None yet'}</dd>
                      </div>
                      <div className="inspection-card__notes">
                        <dt>Notes</dt>
                        <dd>{row.visitNotes || 'No notes yet'}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="inspection-card__actions">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => openWorkPanel(row)}
                    >
                      {isActive ? 'Editing above ↑' : 'Work on visit'}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary inspection-btn-approve"
                      disabled={Boolean(busyId)}
                      onClick={() => decide(row.inspectionId, 'approved')}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="btn-danger"
                      disabled={Boolean(busyId)}
                      onClick={() => decide(row.inspectionId, 'rejected')}
                    >
                      Reject
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </section>
  )
}

export default InspectionQueuePage
