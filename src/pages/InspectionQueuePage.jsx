import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import DataTableShell from '../components/ui/DataTableShell'
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
 * Spec §6 — assign inspector, schedule visit, upload evidence, approve/reject.
 */
function InspectionQueuePage() {
  const [queue, setQueue] = useState([])
  const [contracts, setContracts] = useState([])
  const [inspectors, setInspectors] = useState([])
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [scheduleDate, setScheduleDate] = useState('')
  const [inspectorId, setInspectorId] = useState('')
  const [evidenceFile, setEvidenceFile] = useState(null)

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

  const pendingContracts = contracts.filter((c) => c.status === 'field_inspection_pending')

  const openCase = async (contractId) => {
    try {
      await createInspection({
        contractId,
        scheduledDate: scheduleDate || new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
        assignedInspectorId: inspectorId ? Number(inspectorId) : null,
        outcome: 'pending',
      })
      toast.success('Inspection case opened')
      load()
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Could not open case')
    }
  }

  const saveVisit = async (id) => {
    try {
      await updateInspection(id, {
        visitNotes: notes,
        scheduledDate: scheduleDate || undefined,
        assignedInspectorId: inspectorId ? Number(inspectorId) : undefined,
      })
      if (evidenceFile) {
        await uploadInspectionEvidence(id, evidenceFile)
        setEvidenceFile(null)
      }
      toast.success('Visit details saved')
      setNotes('')
      setSelectedId(null)
      load()
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Could not save visit')
    }
  }

  const decide = async (id, outcome) => {
    try {
      const user = getCurrentUser()
      await decideInspection(id, outcome, user?.userId || user?.id || null)
      toast.success(`Contract ${outcome === 'approved' ? 'verified' : 'disputed'}`)
      load()
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Decision failed')
    }
  }

  const inspectorName = (id) => {
    if (!id) return '—'
    const u = inspectors.find((i) => i.userId === id)
    return u ? u.username : `#${id}`
  }

  return (
    <section className="dashboard-page">
      <PageHeader
        breadcrumb="Bankability › Field inspections"
        title="Buyer inspection queue"
        subtitle="Assign an inspector, schedule the visit, upload evidence, then approve or reject."
        actions={
          <button type="button" className="btn-primary" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />

      <div className="widgets four">
        <StatCard title="Pending visits" value={String(queue.length)} />
        <StatCard title="Awaiting case" value={String(pendingContracts.length)} meta="Contracts ready for inspection" />
        <StatCard title="Total contracts" value={String(contracts.length)} />
        <StatCard title="Verified" value={String(contracts.filter((c) => c.status === 'verified').length)} />
      </div>

      <div className="mt-4 flex flex-wrap gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <label className="text-sm">
          Default schedule
          <input
            type="date"
            className="ml-2 rounded-lg border border-[var(--border)] bg-transparent p-2"
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
          />
        </label>
        <label className="text-sm">
          Assign inspector
          <select
            className="ml-2 rounded-lg border border-[var(--border)] bg-transparent p-2"
            value={inspectorId}
            onChange={(e) => setInspectorId(e.target.value)}
          >
            <option value="">Unassigned</option>
            {inspectors.map((i) => (
              <option key={i.userId} value={i.userId}>
                {i.username}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 space-y-6">
        <DataTableShell title="Open a case from pending contracts">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Buyer</th>
                <th>Value</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pendingContracts.length === 0 ? (
                <tr>
                  <td colSpan={5}>No contracts waiting for field inspection.</td>
                </tr>
              ) : (
                pendingContracts.map((c) => (
                  <tr key={c.contractId}>
                    <td>#{c.contractId}</td>
                    <td>{c.buyerName}</td>
                    <td>{c.contractValue}</td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td>
                      <button type="button" className="btn-secondary" onClick={() => openCase(c.contractId)}>
                        Open inspection
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </DataTableShell>

        <DataTableShell title="Active inspection cases">
          <table className="data-table">
            <thead>
              <tr>
                <th>Case</th>
                <th>Contract</th>
                <th>Inspector</th>
                <th>Scheduled</th>
                <th>Evidence</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {queue.length === 0 ? (
                <tr>
                  <td colSpan={7}>Queue is empty.</td>
                </tr>
              ) : (
                queue.map((row) => (
                  <tr key={row.inspectionId}>
                    <td>#{row.inspectionId}</td>
                    <td>#{row.contractId}</td>
                    <td>{inspectorName(row.assignedInspectorId)}</td>
                    <td>{row.scheduledDate || '—'}</td>
                    <td className="max-w-[120px] truncate text-xs">{row.evidenceUrls || '—'}</td>
                    <td className="max-w-[160px] truncate">{row.visitNotes || '—'}</td>
                    <td className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          setSelectedId(row.inspectionId)
                          setNotes(row.visitNotes || '')
                          setScheduleDate(row.scheduledDate || '')
                          setInspectorId(row.assignedInspectorId ? String(row.assignedInspectorId) : '')
                        }}
                      >
                        Edit visit
                      </button>
                      <button type="button" className="btn-primary" onClick={() => decide(row.inspectionId, 'approved')}>
                        Approve
                      </button>
                      <button type="button" className="btn-secondary" onClick={() => decide(row.inspectionId, 'rejected')}>
                        Reject
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </DataTableShell>

        {selectedId ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <h3 className="mb-2 font-semibold">Visit details — case #{selectedId}</h3>
            <textarea
              className="w-full rounded-lg border border-[var(--border)] bg-transparent p-3"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What did the field team observe?"
            />
            <div className="mt-3 flex flex-wrap gap-3">
              <label className="text-sm">
                Schedule
                <input
                  type="date"
                  className="ml-2 rounded-lg border border-[var(--border)] bg-transparent p-2"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                />
              </label>
              <label className="text-sm">
                Inspector
                <select
                  className="ml-2 rounded-lg border border-[var(--border)] bg-transparent p-2"
                  value={inspectorId}
                  onChange={(e) => setInspectorId(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {inspectors.map((i) => (
                    <option key={i.userId} value={i.userId}>
                      {i.username}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Evidence photo/PDF
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="ml-2 block text-sm"
                  onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
            <div className="mt-3 flex gap-2">
              <button type="button" className="btn-primary" onClick={() => saveVisit(selectedId)}>
                Save visit
              </button>
              <button type="button" className="btn-secondary" onClick={() => setSelectedId(null)}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}

export default InspectionQueuePage
