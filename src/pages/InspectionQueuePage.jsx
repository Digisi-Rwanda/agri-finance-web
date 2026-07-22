import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import {
  cancelInspection,
  createInspection,
  decideInspection,
  dedupeInspections,
  listContracts,
  listInspections,
  listInspectors,
  updateInspection,
  uploadInspectionEvidence,
} from '../services/bankabilityService'
import { getCurrentUser } from '../services/auth'

function formatValue(value) {
  if (value == null || value === '') return '—'
  const n = Number(value)
  if (Number.isFinite(n)) return `${n.toLocaleString()} Rwf`
  return String(value)
}

function visitScore(row) {
  let score = 0
  if (row.visitNotes) score += 2
  if (row.evidenceUrls) score += 2
  if (row.assignedInspectorId) score += 1
  return score
}

/**
 * Field inspections — only active visits and decide.
 * Buyer OTP already opens a case; staff work the visit then approve/reject.
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

  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      const raw = sessionStorage.getItem('inspection-dismissed')
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  const workPanelRef = useRef(null)
  const defaultSchedule = () => new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)

  const rememberDismissed = (id) => {
    setDismissedIds((prev) => {
      const next = Array.from(new Set([...prev, Number(id)]))
      try {
        sessionStorage.setItem('inspection-dismissed', JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
    setQueue((prev) => prev.filter((row) => Number(row.inspectionId) !== Number(id)))
  }

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
      toast.error(
        e?.response?.data?.message || e?.response?.data?.error || 'Failed to load inspection queue',
      )
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

  const activeQueue = useMemo(() => {
    const dismissed = new Set(dismissedIds.map(Number))
    return queue.filter((row) => {
      if (dismissed.has(Number(row.inspectionId))) return false
      const status = String(contractById.get(Number(row.contractId))?.status || '').toLowerCase()
      if (status === 'verified' || status === 'disputed') return false
      return true
    })
  }, [queue, contractById, dismissedIds])

  const { primaryQueue, duplicateQueue } = useMemo(() => {
    const byContract = new Map()
    const duplicates = []
    ;[...activeQueue]
      .sort((a, b) => Number(b.inspectionId || 0) - Number(a.inspectionId || 0))
      .forEach((row) => {
        const cid = Number(row.contractId)
        const current = byContract.get(cid)
        if (!current) {
          byContract.set(cid, row)
          return
        }
        if (visitScore(row) > visitScore(current)) {
          duplicates.push(current)
          byContract.set(cid, row)
        } else {
          duplicates.push(row)
        }
      })
    return {
      primaryQueue: Array.from(byContract.values()),
      duplicateQueue: duplicates,
    }
  }, [activeQueue])

  const openCaseIds = useMemo(
    () => new Set(primaryQueue.map((row) => Number(row.contractId))),
    [primaryQueue],
  )

  const missingCases = useMemo(
    () =>
      contracts.filter(
        (c) =>
          String(c.status || '').toLowerCase() === 'field_inspection_pending' &&
          !openCaseIds.has(Number(c.contractId)),
      ),
    [contracts, openCaseIds],
  )

  const selectedCase =
    primaryQueue.find((row) => row.inspectionId === selectedId) ||
    queue.find((row) => row.inspectionId === selectedId) ||
    null
  const selectedContract = selectedCase
    ? contractById.get(Number(selectedCase.contractId))
    : null

  const inspectorName = (id) => {
    if (!id) return 'Unassigned'
    const u = inspectors.find((i) => Number(i.userId) === Number(id))
    return u ? u.username : `#${id}`
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
    const existing = primaryQueue.find((row) => Number(row.contractId) === Number(contractId))
    if (existing) {
      openWorkPanel(existing)
      return
    }
    setBusyId(`open-${contractId}`)
    try {
      const created = await createInspection({
        contractId,
        scheduledDate: scheduleDate || defaultSchedule(),
        assignedInspectorId: inspectorId ? Number(inspectorId) : null,
        outcome: 'pending',
      })
      toast.success(`Case #${created?.inspectionId || ''} ready`)
      await load()
      if (created?.inspectionId) openWorkPanel(created)
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.response?.data?.message || 'Could not open case')
    } finally {
      setBusyId(null)
    }
  }

  const removeDuplicate = async (id) => {
    setBusyId(`cancel-${id}`)
    try {
      await cancelInspection(id)
      toast.success(`Removed case #${id}`)
      if (selectedId === id) closeWorkPanel()
      rememberDismissed(id)
      await load()
    } catch (e) {
      rememberDismissed(id)
      if (selectedId === id) closeWorkPanel()
      toast.info(`Case #${id} hidden here`)
    } finally {
      setBusyId(null)
    }
  }

  const runDedupe = async () => {
    setBusyId('dedupe')
    try {
      const dedupe = await dedupeInspections()
      const removed = dedupe?.cancelled || dedupe?.removed || 0
      toast.success(removed > 0 ? `Removed ${removed} duplicate(s)` : 'No duplicates')
      await load()
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.response?.data?.error || 'Cleanup failed')
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
      toast.success('Visit saved')
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
    setBusyId(`decide-${id}`)
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
        title="Inspections"
        subtitle="Work the visit, save notes/evidence, then approve or reject."
        actions={
          <div className="flex flex-wrap gap-2">
            {duplicateQueue.length > 0 ? (
              <button
                type="button"
                className="btn-secondary"
                onClick={runDedupe}
                disabled={busyId === 'dedupe' || loading}
              >
                {busyId === 'dedupe' ? 'Cleaning…' : `Remove ${duplicateQueue.length} duplicate(s)`}
              </button>
            ) : null}
            <button type="button" className="btn-primary" onClick={load} disabled={loading}>
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        }
      />

      <div className="widgets four">
        <StatCard title="Active visits" value={String(primaryQueue.length)} />
        <StatCard title="Missing case" value={String(missingCases.length)} meta="Rare" />
        <StatCard title="Duplicates" value={String(duplicateQueue.length)} />
        <StatCard
          title="Verified"
          value={String(contracts.filter((c) => c.status === 'verified').length)}
        />
      </div>

      {selectedCase ? (
        <div className="inspection-work mt-4" ref={workPanelRef}>
          <div className="inspection-work__head">
            <div>
              <p className="inspection-work__eyebrow">Visit</p>
              <h2>
                Contract #{selectedCase.contractId}
                <span className="inspection-card__sub"> · Case #{selectedCase.inspectionId}</span>
              </h2>
              {selectedContract ? (
                <p className="inspection-work__meta">
                  {selectedContract.buyerName || 'Buyer'} · {formatValue(selectedContract.contractValue)}
                </p>
              ) : null}
            </div>
            <button type="button" className="btn-secondary" onClick={closeWorkPanel}>
              Close
            </button>
          </div>

          <div className="inspection-work__grid">
            <label>
              Visit notes
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Crop condition, quantity match, any issues…"
              />
            </label>
            <div className="inspection-work__side">
              <label>
                Visit date
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
                Evidence
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                />
                {evidenceFile ? (
                  <span className="inspection-file-name">{evidenceFile.name}</span>
                ) : selectedCase.evidenceUrls ? (
                  <span className="inspection-file-name">Saved</span>
                ) : null}
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
              {busyId === `save-${selectedId}` ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              className="btn-primary inspection-btn-approve"
              disabled={Boolean(busyId)}
              onClick={() => decide(selectedId, 'approved')}
            >
              Approve &amp; verify
            </button>
            <button
              type="button"
              className="btn-danger"
              disabled={Boolean(busyId)}
              onClick={() => decide(selectedId, 'rejected')}
            >
              Reject
            </button>
          </div>
        </div>
      ) : null}

      {missingCases.length > 0 ? (
        <section className="inspection-section mt-6">
          <div className="inspection-section__head">
            <h2>Waiting for a case</h2>
            <p>Buyer OTP done but no visit case yet — open one.</p>
          </div>
          <div className="inspection-card-list">
            {missingCases.map((c) => (
              <article key={c.contractId} className="inspection-card">
                <div className="inspection-card__main">
                  <div className="inspection-card__title-row">
                    <h3>Contract #{c.contractId}</h3>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="inspection-work__meta">
                    {c.buyerName || '—'} · {formatValue(c.contractValue)}
                  </p>
                </div>
                <div className="inspection-card__actions">
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={busyId === `open-${c.contractId}`}
                    onClick={() => openCase(c.contractId)}
                  >
                    {busyId === `open-${c.contractId}` ? 'Opening…' : 'Open case'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="inspection-section mt-6">
        <div className="inspection-section__head">
          <h2>Active visits</h2>
          <p>One case per contract. Open visit to save notes, then approve or reject.</p>
        </div>

        {primaryQueue.length === 0 ? (
          <div className="inspection-empty">
            {loading ? 'Loading…' : 'No active visits. Cases appear here after buyer OTP.'}
          </div>
        ) : (
          <div className="inspection-card-list">
            {primaryQueue.map((row) => {
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
                        Contract #{row.contractId}
                        <span className="inspection-card__sub"> · Case #{row.inspectionId}</span>
                      </h3>
                      <StatusBadge status="pending" />
                    </div>
                    <dl className="inspection-card__facts">
                      <div>
                        <dt>Buyer</dt>
                        <dd>{contract?.buyerName || '—'}</dd>
                      </div>
                      <div>
                        <dt>Value</dt>
                        <dd>{formatValue(contract?.contractValue)}</dd>
                      </div>
                      <div>
                        <dt>Inspector</dt>
                        <dd>{inspectorName(row.assignedInspectorId)}</dd>
                      </div>
                      <div>
                        <dt>Date</dt>
                        <dd>{row.scheduledDate || 'Not set'}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="inspection-card__actions">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => openWorkPanel(row)}
                    >
                      {isActive ? 'Editing ↑' : 'Open visit'}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {duplicateQueue.length > 0 ? (
        <section className="inspection-section mt-6">
          <div className="inspection-section__head">
            <h2>Duplicates</h2>
            <p>Extra cases for the same contract — remove them.</p>
          </div>
          <div className="inspection-card-list">
            {duplicateQueue.map((row) => (
              <article key={row.inspectionId} className="inspection-card inspection-card--dup">
                <div className="inspection-card__main">
                  <h3>
                    Case #{row.inspectionId}
                    <span className="inspection-card__sub"> · Contract #{row.contractId}</span>
                  </h3>
                </div>
                <div className="inspection-card__actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={busyId === `cancel-${row.inspectionId}`}
                    onClick={() => removeDuplicate(row.inspectionId)}
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  )
}

export default InspectionQueuePage
