import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import DataTableShell from '../components/ui/DataTableShell'
import {
  addCoopMember,
  claimCoopWarehouse,
  deliverInputLoan,
  getCoopDashboard,
  issueReceipt,
  listCoopWarehouses,
  listWarehouses,
  recordCoopStorage,
  updateCoopGovernance,
} from '../services/bankabilityService'
import { getCurrentUser } from '../services/auth'

/**
 * Cooperative operator dashboard — Spec §7.
 */
function CooperativeDashboardPage() {
  const user = getCurrentUser()
  const operatorUserId = user?.userId || user?.id
  const [warehouses, setWarehouses] = useState([])
  const [allWarehouses, setAllWarehouses] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [dash, setDash] = useState(null)
  const [loading, setLoading] = useState(true)
  const [memberFarmerId, setMemberFarmerId] = useState('')
  const [storageForm, setStorageForm] = useState({
    farmerId: '',
    commodity: '',
    quantity: '',
    grade: '',
    binOrLot: '',
  })
  const [receiptForm, setReceiptForm] = useState({
    farmerId: '',
    commodity: '',
    quantity: '',
    grade: '',
  })
  const [governance, setGovernance] = useState('')

  const loadWarehouses = async () => {
    setLoading(true)
    try {
      const [mine, all] = await Promise.all([
        operatorUserId ? listCoopWarehouses(operatorUserId) : Promise.resolve([]),
        listWarehouses('approved').catch(() => listWarehouses()),
      ])
      setWarehouses(Array.isArray(mine) ? mine : [])
      setAllWarehouses(Array.isArray(all) ? all : [])
      if (!selectedId && mine?.length) {
        setSelectedId(mine[0].warehouseId)
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to load warehouses')
    } finally {
      setLoading(false)
    }
  }

  const loadDash = async (id) => {
    if (!id) {
      setDash(null)
      return
    }
    try {
      const data = await getCoopDashboard(id)
      setDash(data)
      setGovernance(data?.warehouse?.governanceChecklist || '')
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Dashboard failed')
    }
  }

  useEffect(() => {
    loadWarehouses()
  }, [operatorUserId])

  useEffect(() => {
    if (selectedId) loadDash(selectedId)
  }, [selectedId])

  const claim = async (warehouseId) => {
    try {
      await claimCoopWarehouse(warehouseId, operatorUserId)
      toast.success('Warehouse claimed for your cooperative account')
      await loadWarehouses()
      setSelectedId(warehouseId)
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Claim failed')
    }
  }

  return (
    <section className="dashboard-page">
      <PageHeader
        breadcrumb="Cooperative › Operations"
        title="Cooperative dashboard"
        subtitle="Manage farmer membership, storage lots, warehouse receipts, and input deliveries."
        actions={
          <button type="button" className="btn-primary" onClick={loadWarehouses} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />

      <div className="widgets four">
        <StatCard title="My warehouses" value={String(warehouses.length)} />
        <StatCard title="Members" value={String(dash?.memberCount ?? 0)} />
        <StatCard title="Storage lots" value={String(dash?.storage?.length ?? 0)} />
        <StatCard title="Receipts" value={String(dash?.receipts?.length ?? 0)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <h3 className="mb-2 font-semibold">Select warehouse</h3>
          <select
            className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
            value={selectedId || ''}
            onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Choose…</option>
            {warehouses.map((w) => (
              <option key={w.warehouseId} value={w.warehouseId}>
                {w.cooperativeName} (#{w.warehouseId})
              </option>
            ))}
          </select>
          <p className="mt-3 text-sm text-[var(--text-muted)]">Claim an approved warehouse:</p>
          <ul className="mt-2 max-h-40 space-y-2 overflow-auto text-sm">
            {(allWarehouses || [])
              .filter((w) => w.approvalStatus === 'approved' && !w.operatorUserId)
              .map((w) => (
                <li key={w.warehouseId} className="flex items-center justify-between gap-2">
                  <span>
                    {w.cooperativeName} — {w.location || '—'}
                  </span>
                  <button type="button" className="btn-secondary" onClick={() => claim(w.warehouseId)}>
                    Claim
                  </button>
                </li>
              ))}
          </ul>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <h3 className="mb-2 font-semibold">Governance checklist</h3>
          <textarea
            className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
            rows={4}
            value={governance}
            onChange={(e) => setGovernance(e.target.value)}
            placeholder="Board, bylaws, insurance, grading standard…"
            disabled={!selectedId}
          />
          <button
            type="button"
            className="btn-primary mt-2"
            disabled={!selectedId}
            onClick={async () => {
              try {
                await updateCoopGovernance(selectedId, {
                  governanceChecklist: governance,
                  governanceVerified: true,
                })
                toast.success('Governance saved')
                loadDash(selectedId)
              } catch (e) {
                toast.error(e?.response?.data?.error || 'Save failed')
              }
            }}
          >
            Save governance
          </button>
        </div>
      </div>

      {selectedId ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <form
            className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
            onSubmit={async (e) => {
              e.preventDefault()
              try {
                await addCoopMember(selectedId, Number(memberFarmerId))
                toast.success('Member added')
                setMemberFarmerId('')
                loadDash(selectedId)
              } catch (err) {
                toast.error(err?.response?.data?.error || 'Add member failed')
              }
            }}
          >
            <h3 className="font-semibold">Add farmer member</h3>
            <input
              className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
              placeholder="Farmer ID"
              value={memberFarmerId}
              onChange={(e) => setMemberFarmerId(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary">
              Add member
            </button>
          </form>

          <form
            className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
            onSubmit={async (e) => {
              e.preventDefault()
              try {
                await recordCoopStorage({
                  warehouseId: selectedId,
                  farmerId: storageForm.farmerId ? Number(storageForm.farmerId) : null,
                  commodity: storageForm.commodity,
                  quantity: Number(storageForm.quantity),
                  grade: storageForm.grade || null,
                  binOrLot: storageForm.binOrLot || null,
                })
                toast.success('Storage recorded')
                setStorageForm({ farmerId: '', commodity: '', quantity: '', grade: '', binOrLot: '' })
                loadDash(selectedId)
              } catch (err) {
                toast.error(err?.response?.data?.error || 'Storage failed')
              }
            }}
          >
            <h3 className="font-semibold">Record storage lot</h3>
            <input
              className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
              placeholder="Farmer ID"
              value={storageForm.farmerId}
              onChange={(e) => setStorageForm({ ...storageForm, farmerId: e.target.value })}
            />
            <input
              className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
              placeholder="Commodity"
              value={storageForm.commodity}
              onChange={(e) => setStorageForm({ ...storageForm, commodity: e.target.value })}
              required
            />
            <input
              className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
              placeholder="Quantity (kg)"
              value={storageForm.quantity}
              onChange={(e) => setStorageForm({ ...storageForm, quantity: e.target.value })}
              required
            />
            <input
              className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
              placeholder="Grade"
              value={storageForm.grade}
              onChange={(e) => setStorageForm({ ...storageForm, grade: e.target.value })}
            />
            <input
              className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
              placeholder="Bin / lot"
              value={storageForm.binOrLot}
              onChange={(e) => setStorageForm({ ...storageForm, binOrLot: e.target.value })}
            />
            <button type="submit" className="btn-primary">
              Save storage
            </button>
          </form>

          <form
            className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
            onSubmit={async (e) => {
              e.preventDefault()
              try {
                const wh = dash?.warehouse
                await issueReceipt({
                  cooperativeName: wh?.cooperativeName || 'Cooperative',
                  cooperativeWarehouseId: selectedId,
                  farmerId: Number(receiptForm.farmerId),
                  commodity: receiptForm.commodity,
                  quantity: Number(receiptForm.quantity),
                  grade: receiptForm.grade || null,
                  status: 'active',
                })
                toast.success('Receipt issued')
                setReceiptForm({ farmerId: '', commodity: '', quantity: '', grade: '' })
                loadDash(selectedId)
              } catch (err) {
                toast.error(err?.response?.data?.error || 'Receipt failed')
              }
            }}
          >
            <h3 className="font-semibold">Issue warehouse receipt</h3>
            <input
              className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
              placeholder="Farmer ID"
              value={receiptForm.farmerId}
              onChange={(e) => setReceiptForm({ ...receiptForm, farmerId: e.target.value })}
              required
            />
            <input
              className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
              placeholder="Commodity"
              value={receiptForm.commodity}
              onChange={(e) => setReceiptForm({ ...receiptForm, commodity: e.target.value })}
              required
            />
            <input
              className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
              placeholder="Quantity"
              value={receiptForm.quantity}
              onChange={(e) => setReceiptForm({ ...receiptForm, quantity: e.target.value })}
              required
            />
            <input
              className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
              placeholder="Grade"
              value={receiptForm.grade}
              onChange={(e) => setReceiptForm({ ...receiptForm, grade: e.target.value })}
            />
            <button type="submit" className="btn-primary">
              Issue receipt
            </button>
          </form>
        </div>
      ) : null}

      {dash ? (
        <div className="mt-6 space-y-6">
          <DataTableShell title="Members">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Farmer</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {(dash.members || []).length === 0 ? (
                  <tr>
                    <td colSpan={3}>No members yet.</td>
                  </tr>
                ) : (
                  dash.members.map((m) => (
                    <tr key={m.membershipId}>
                      <td>#{m.farmerId}</td>
                      <td>{m.status}</td>
                      <td>{m.joinedAt ? String(m.joinedAt).slice(0, 10) : '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </DataTableShell>

          <DataTableShell title="Storage">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Commodity</th>
                  <th>Qty</th>
                  <th>Farmer</th>
                  <th>Bin</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(dash.storage || []).length === 0 ? (
                  <tr>
                    <td colSpan={5}>No storage lots.</td>
                  </tr>
                ) : (
                  dash.storage.map((s) => (
                    <tr key={s.storageRecordId}>
                      <td>{s.commodity}</td>
                      <td>
                        {s.quantity} {s.unit}
                      </td>
                      <td>{s.farmerId ? `#${s.farmerId}` : '—'}</td>
                      <td>{s.binOrLot || '—'}</td>
                      <td>{s.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </DataTableShell>

          <DataTableShell title="Pending input deliveries">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Loan</th>
                  <th>Farmer</th>
                  <th>Type</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(dash.pendingInputDeliveries || []).length === 0 ? (
                  <tr>
                    <td colSpan={4}>None pending.</td>
                  </tr>
                ) : (
                  dash.pendingInputDeliveries.map((loan) => (
                    <tr key={loan.inputLoanId}>
                      <td>#{loan.inputLoanId}</td>
                      <td>#{loan.farmerId}</td>
                      <td>{loan.inputType}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={async () => {
                            try {
                              await deliverInputLoan(loan.inputLoanId)
                              toast.success('Delivery confirmed')
                              loadDash(selectedId)
                            } catch (err) {
                              toast.error(err?.response?.data?.error || 'Deliver failed')
                            }
                          }}
                        >
                          Confirm delivery
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </DataTableShell>
        </div>
      ) : null}
    </section>
  )
}

export default CooperativeDashboardPage
