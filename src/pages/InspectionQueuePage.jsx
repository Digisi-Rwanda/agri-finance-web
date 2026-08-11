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
import { usePageCopy } from '../context/AuthLocaleContext'

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

const defaultSchedule = () => new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)

/**
 * Field inspections — only active visits and decide.
 * Buyer OTP already opens a case; staff work the visit then approve/reject.
 */
/* eslint-disable react-hooks/set-state-in-effect -- initial queue fetch on mount, same as other role homes */
function InspectionQueuePage() {
  const { s, p } = usePageCopy('inspections')
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
      toast.error(e?.response?.data?.message || e?.response?.data?.error || p.loadFailed)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
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

  const unassignedCount = useMemo(
    () => primaryQueue.filter((row) => !row.assignedInspectorId).length,
    [primaryQueue],
  )

  const verifiedCount = useMemo(
    () =>
      contracts.filter((c) => String(c.status || '').toLowerCase() === 'verified').length,
    [contracts],
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
    if (!id) return p.unassignedLabel
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
      toast.success(p.caseReady(created?.inspectionId || ''))
      await load()
      if (created?.inspectionId) openWorkPanel(created)
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.response?.data?.message || p.openCaseFailed)
    } finally {
      setBusyId(null)
    }
  }

  const removeDuplicate = async (id) => {
    setBusyId(`cancel-${id}`)
    try {
      await cancelInspection(id)
      toast.success(p.caseRemoved(id))
      if (selectedId === id) closeWorkPanel()
      rememberDismissed(id)
      await load()
    } catch {
      rememberDismissed(id)
      if (selectedId === id) closeWorkPanel()
      toast.info(p.caseHidden(id))
    } finally {
      setBusyId(null)
    }
  }

  const runDedupe = async () => {
    setBusyId('dedupe')
    try {
      const dedupe = await dedupeInspections()
      const removed = dedupe?.cancelled || dedupe?.removed || 0
      toast.success(removed > 0 ? p.duplicatesRemoved(removed) : p.noDuplicates)
      await load()
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.response?.data?.error || p.cleanupFailed)
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
      toast.success(p.visitSaved)
      await load()
    } catch (e) {
      toast.error(e?.response?.data?.error || p.saveVisitFailed)
    } finally {
      setBusyId(null)
    }
  }

  const decide = async (id, outcome) => {
    const confirmMsg = outcome === 'approved' ? p.confirmApprove : p.confirmReject
    if (!window.confirm(confirmMsg)) return
    setBusyId(`decide-${id}`)
    try {
      const user = getCurrentUser()
      await decideInspection(id, outcome, user?.userId || user?.id || null)
      toast.success(outcome === 'approved' ? p.contractVerified : p.contractDisputed)
      if (selectedId === id) closeWorkPanel()
      await load()
    } catch (e) {
      toast.error(e?.response?.data?.error || p.decisionFailed)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="dashboard-page dashboard-page--compact inspection-page">
      <PageHeader
        title={p.title}
        subtitle={p.subtitle}
        actions={
          <button type="button" className="btn-secondary" onClick={load} disabled={loading}>
            {loading ? s.refreshing : s.refresh}
          </button>
        }
      />

      <div className="widgets four">
        <StatCard title={p.activeVisits} value={String(primaryQueue.length)} meta={p.activeVisitsMeta} />
        <StatCard title={p.unassigned} value={String(unassignedCount)} meta={p.unassignedMeta} />
        <StatCard title={p.awaitingCase} value={String(missingCases.length)} meta={p.awaitingCaseMeta} />
        <StatCard title={p.verified} value={String(verifiedCount)} meta={p.verifiedMeta} />
      </div>

      {selectedCase ? (
        <div className="inspection-work" ref={workPanelRef}>
          <div className="inspection-work__head">
            <div>
              <p className="inspection-work__eyebrow">{p.visitEyebrow}</p>
              <h2>
                Contract #{selectedCase.contractId}
                <span className="inspection-card__sub"> · Case #{selectedCase.inspectionId}</span>
              </h2>
              {selectedContract ? (
                <p className="inspection-work__meta">
                  {selectedContract.buyerName || p.buyerLabel} · {formatValue(selectedContract.contractValue)}
                </p>
              ) : null}
            </div>
            <button type="button" className="btn-secondary" onClick={closeWorkPanel}>
              {s.close}
            </button>
          </div>

          <div className="inspection-work__grid">
            <label>
              {p.visitNotes}
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={p.notesPlaceholder}
              />
            </label>
            <div className="inspection-work__side">
              <label>
                {p.visitDate}
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                />
              </label>
              <label>
                {p.inspector}
                <select value={inspectorId} onChange={(e) => setInspectorId(e.target.value)}>
                  <option value="">{p.unassignedLabel}</option>
                  {inspectors.map((i) => (
                    <option key={i.userId} value={i.userId}>
                      {i.username}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {p.evidence}
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                />
                {evidenceFile ? (
                  <span className="inspection-file-name">{evidenceFile.name}</span>
                ) : selectedCase.evidenceUrls ? (
                  <span className="inspection-file-name">{p.saved}</span>
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
              {busyId === `save-${selectedId}` ? s.saving : s.save}
            </button>
            <button
              type="button"
              className="btn-primary inspection-btn-approve"
              disabled={Boolean(busyId)}
              onClick={() => decide(selectedId, 'approved')}
            >
              {p.approveVerify}
            </button>
            <button
              type="button"
              className="btn-danger"
              disabled={Boolean(busyId)}
              onClick={() => decide(selectedId, 'rejected')}
            >
              {s.reject}
            </button>
          </div>
        </div>
      ) : null}

      {missingCases.length > 0 ? (
        <section className="inspection-section">
          <div className="inspection-section__head">
            <h2>{p.awaitingTitle}</h2>
            <p>{p.awaitingBody}</p>
          </div>
          <div className="inspection-card-list">
            {missingCases.map((c) => (
              <article key={c.contractId} className="inspection-card">
                <div className="inspection-card__main">
                  <div className="inspection-card__title-row">
                    <h3>Contract #{c.contractId}</h3>
                    <StatusBadge value={c.status} />
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
                    {busyId === `open-${c.contractId}` ? p.opening : p.openCase}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="inspection-section">
        <div className="inspection-section__head">
          <h2>{p.activeTitle}</h2>
          <p>{p.activeBody}</p>
        </div>

        {primaryQueue.length === 0 ? (
          <div className="inspection-empty">
            {loading ? s.loading : p.activeEmpty}
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
                      <StatusBadge value="pending" />
                    </div>
                    <dl className="inspection-card__facts">
                      <div>
                        <dt>{p.colBuyer}</dt>
                        <dd>{contract?.buyerName || '—'}</dd>
                      </div>
                      <div>
                        <dt>{p.colValue}</dt>
                        <dd>{formatValue(contract?.contractValue)}</dd>
                      </div>
                      <div>
                        <dt>{p.colInspector}</dt>
                        <dd>{inspectorName(row.assignedInspectorId)}</dd>
                      </div>
                      <div>
                        <dt>{p.colDate}</dt>
                        <dd>{row.scheduledDate || p.notSet}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="inspection-card__actions">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => openWorkPanel(row)}
                    >
                      {isActive ? p.editing : p.openVisit}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {duplicateQueue.length > 0 ? (
        <section className="inspection-section">
          <div className="inspection-section__head inspection-section__head--row">
            <div>
              <h2>{p.duplicates}</h2>
              <p>{p.duplicatesDesc}</p>
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={runDedupe}
              disabled={busyId === 'dedupe' || loading}
            >
              {busyId === 'dedupe' ? p.cleaning : p.removeAll(duplicateQueue.length)}
            </button>
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
                    {busyId === `cancel-${row.inspectionId}` ? p.removing : p.remove}
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
