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
  updateInspection,
} from '../services/bankabilityService'
import { getCurrentUser } from '../services/auth'

/**
 * Digisi field inspection queue (web).
 * Comment: Feature 6 — manual human trust checkpoint for buyer verification.
 */
function InspectionQueuePage() {
  const [queue, setQueue] = useState([])
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [pending, allContracts] = await Promise.all([
        listInspections('pending'),
        listContracts(),
      ])
      setQueue(Array.isArray(pending) ? pending : [])
      setContracts(Array.isArray(allContracts) ? allContracts : [])
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
        scheduledDate: new Date().toISOString().slice(0, 10),
        outcome: 'pending',
      })
      toast.success('Inspection case opened')
      load()
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Could not open case')
    }
  }

  const saveNotes = async (id) => {
    try {
      await updateInspection(id, { visitNotes: notes, evidenceUrls: '' })
      toast.success('Visit notes saved')
      setNotes('')
      setSelectedId(null)
      load()
    } catch (e) {
      toast.error('Could not save notes')
    }
  }

  const decide = async (id, outcome) => {
    try {
      const user = getCurrentUser()
      await decideInspection(id, outcome, user?.userId || user?.id || null)
      toast.success(`Contract ${outcome}`)
      load()
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Decision failed')
    }
  }

  return (
    <section className="dashboard-page">
      <PageHeader
        breadcrumb="Bankability › Field inspections"
        title="Buyer inspection queue"
        subtitle="Physically verify contract counterparties before marking receivables as verified collateral."
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
                <th>Scheduled</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {queue.length === 0 ? (
                <tr>
                  <td colSpan={5}>Queue is empty.</td>
                </tr>
              ) : (
                queue.map((row) => (
                  <tr key={row.inspectionId}>
                    <td>#{row.inspectionId}</td>
                    <td>#{row.contractId}</td>
                    <td>{row.scheduledDate || '—'}</td>
                    <td>{row.visitNotes || '—'}</td>
                    <td className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          setSelectedId(row.inspectionId)
                          setNotes(row.visitNotes || '')
                        }}
                      >
                        Notes
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
            <h3 className="mb-2 font-semibold">Visit notes — case #{selectedId}</h3>
            <textarea
              className="w-full rounded-lg border border-[var(--border)] bg-transparent p-3"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What did the field team observe?"
            />
            <div className="mt-3 flex gap-2">
              <button type="button" className="btn-primary" onClick={() => saveNotes(selectedId)}>
                Save notes
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
