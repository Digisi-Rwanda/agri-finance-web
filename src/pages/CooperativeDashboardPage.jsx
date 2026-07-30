import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import DataTableShell from '../components/ui/DataTableShell'
import StatusBadge from '../components/ui/StatusBadge'
import {
  addCoopMember,
  applyWarehouse,
  claimCoopWarehouse,
  confirmInputLoanByCoop,
  deliverInputLoan,
  getCoopDashboard,
  issueReceipt,
  listCoopWarehouses,
  listWarehouses,
  recordCoopStorage,
  updateCoopGovernance,
} from '../services/bankabilityService'
import { getCurrentUser, getProfile, hydrateSessionUser } from '../services/auth'

/* Cooperative dashboard fetches on mount/selection — same pattern as other role homes. */
/* eslint-disable react-hooks/set-state-in-effect */

/**
 * Cooperative operator dashboard — membership, storage, receipts, input loans.
 */
function CooperativeDashboardPage() {
  const [operatorUserId, setOperatorUserId] = useState(
    () => getCurrentUser()?.userId || getCurrentUser()?.id || null,
  )
  const [warehouses, setWarehouses] = useState([])
  const [allWarehouses, setAllWarehouses] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [linkWarehouseId, setLinkWarehouseId] = useState('')
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
    weightKg: '',
    storageLocation: '',
    grade: '',
    expiryDate: '',
  })
  const [whForm, setWhForm] = useState({
    cooperativeName: '',
    location: '',
    storageInsuranceRef: '',
    governanceChecklist: '',
    facilityNotes: '',
  })
  const [governance, setGovernance] = useState('')
  const [busy, setBusy] = useState(false)

  const loadWarehouses = async (userId = operatorUserId) => {
    setLoading(true)
    try {
      const [mine, all] = await Promise.all([
        userId ? listCoopWarehouses(userId) : Promise.resolve([]),
        listWarehouses().catch(() => []),
      ])
      const mineList = Array.isArray(mine) ? mine : []
      setWarehouses(mineList)
      setAllWarehouses(Array.isArray(all) ? all : [])
      setSelectedId((prev) => {
        if (prev && mineList.some((w) => w.warehouseId === prev)) return prev
        return mineList[0]?.warehouseId || null
      })
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to load warehouses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const bootstrap = async () => {
      let userId = getCurrentUser()?.userId || getCurrentUser()?.id || null
      if (!userId) {
        try {
          await hydrateSessionUser()
          userId = getCurrentUser()?.userId || getCurrentUser()?.id || null
        } catch {
          // fall through to profile fetch
        }
      }
      if (!userId) {
        try {
          const profile = await getProfile()
          userId = profile?.userId || null
        } catch {
          // keep null
        }
      }
      setOperatorUserId(userId)
      await loadWarehouses(userId)
    }
    void bootstrap()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time bootstrap
  }, [])

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
      toast.error(e?.response?.data?.error || 'Could not load warehouse dashboard')
    }
  }

  useEffect(() => {
    if (selectedId) void loadDash(selectedId)
  }, [selectedId])

  const claimable = (allWarehouses || []).filter(
    (w) =>
      String(w.approvalStatus || '').toLowerCase() === 'approved' &&
      !w.operatorUserId &&
      !warehouses.some((mine) => mine.warehouseId === w.warehouseId),
  )
  const selectedWarehouse =
    warehouses.find((w) => w.warehouseId === selectedId) || dash?.warehouse || null
  const selectedApproved =
    String(selectedWarehouse?.approvalStatus || '').toLowerCase() === 'approved'
  const canOperate = Boolean(selectedId && selectedApproved)

  const claim = async (warehouseId) => {
    if (!operatorUserId) {
      toast.error('Your account is still loading. Refresh and try again.')
      return
    }
    setBusy(true)
    try {
      await claimCoopWarehouse(warehouseId, operatorUserId)
      toast.success('Warehouse linked to your cooperative account')
      setLinkWarehouseId('')
      await loadWarehouses(operatorUserId)
      setSelectedId(warehouseId)
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Could not link warehouse')
    } finally {
      setBusy(false)
    }
  }

  const registerWarehouse = async (event) => {
    event.preventDefault()
    if (!operatorUserId) {
      toast.error('Your account is still loading. Refresh and try again.')
      return
    }
    setBusy(true)
    try {
      const created = await applyWarehouse({
        ...whForm,
        approvalStatus: 'pending',
        operatorUserId,
      })
      toast.success('Warehouse registered. An administrator must approve it before operations unlock.')
      setWhForm({
        cooperativeName: '',
        location: '',
        storageInsuranceRef: '',
        governanceChecklist: '',
        facilityNotes: '',
      })
      await loadWarehouses(operatorUserId)
      if (created?.warehouseId) setSelectedId(created.warehouseId)
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Could not register warehouse')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="dashboard-page dashboard-page--compact coop-page">
      <PageHeader
        title="Cooperative operations"
        subtitle="Select a warehouse, then manage members, storage, receipts, and deliveries."
        actions={
          <button
            type="button"
            className="btn-secondary"
            onClick={() => loadWarehouses(operatorUserId)}
            disabled={loading}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />

      <div className="widgets four">
        <StatCard title="Warehouses" value={String(warehouses.length)} meta="Linked to you" />
        <StatCard title="Members" value={String(dash?.memberCount ?? 0)} meta="Active farmers" />
        <StatCard title="Storage lots" value={String(dash?.storage?.length ?? 0)} meta="On hand" />
        <StatCard title="Receipts" value={String(dash?.receipts?.length ?? 0)} meta="Issued" />
      </div>

      <div className="dash-section">
        <div className="dash-section__head">
          <h2>Select warehouse</h2>
          <p>Choose the warehouse you want to work in. Operations unlock after approval.</p>
        </div>

        <div className="coop-warehouse-bar">
          <label className="coop-select-field">
            <span>My warehouses</span>
          <select
            value={selectedId || ''}
            onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : null)}
              disabled={loading || warehouses.length === 0}
            >
              <option value="">
                {warehouses.length === 0 ? 'No warehouse linked yet…' : 'Choose warehouse…'}
              </option>
              {warehouses.map((w) => (
                <option key={w.warehouseId} value={w.warehouseId}>
                  {w.cooperativeName} (#{w.warehouseId}) · {w.approvalStatus || 'pending'}
                </option>
              ))}
            </select>
          </label>

          {selectedWarehouse ? (
            <div className="coop-warehouse-status">
              <StatusBadge value={selectedWarehouse.approvalStatus || 'pending'} />
              <span>{selectedWarehouse.location || 'No location set'}</span>
            </div>
          ) : null}
        </div>

        {selectedId && !selectedApproved ? (
          <p className="coop-empty-note">
            This warehouse is waiting for administrator approval. You can review details here, but
            member/storage/receipt actions unlock after it is approved.
          </p>
        ) : null}

        {claimable.length > 0 ? (
          <div className="coop-link-row">
            <label className="coop-select-field">
              <span>Link an approved warehouse</span>
              <select
                value={linkWarehouseId}
                onChange={(e) => setLinkWarehouseId(e.target.value)}
              >
                <option value="">Choose approved warehouse…</option>
                {claimable.map((w) => (
                  <option key={w.warehouseId} value={w.warehouseId}>
                    {w.cooperativeName} — {w.location || 'No location'}
                  </option>
                ))}
              </select>
            </label>
          <button
            type="button"
              className="btn-primary"
              disabled={busy || !linkWarehouseId}
              onClick={() => claim(Number(linkWarehouseId))}
            >
              Link warehouse
          </button>
        </div>
        ) : null}
      </div>

      <form className="insurance-panel coop-register-panel" onSubmit={registerWarehouse}>
        <div className="insurance-panel__head">
          <h2>Register a warehouse</h2>
          <p className="muted">
            Create your cooperative warehouse here. It appears in the selector above as pending until
            an administrator approves it.
          </p>
        </div>
        <div className="insurance-panel__grid insurance-panel__grid--form">
          <label>
            Cooperative name
            <input
              required
              placeholder="e.g. Musanze Farmers Coop"
              value={whForm.cooperativeName}
              onChange={(e) => setWhForm({ ...whForm, cooperativeName: e.target.value })}
            />
          </label>
          <label>
            Location
            <input
              required
              placeholder="District / sector"
              value={whForm.location}
              onChange={(e) => setWhForm({ ...whForm, location: e.target.value })}
            />
          </label>
          <label>
            Storage insurance reference
            <input
              required
              placeholder="Required for approval"
              value={whForm.storageInsuranceRef}
              onChange={(e) => setWhForm({ ...whForm, storageInsuranceRef: e.target.value })}
            />
          </label>
          <label>
            Governance checklist
            <input
              required
              placeholder="Board, bylaws, insurance, grading"
              value={whForm.governanceChecklist}
              onChange={(e) => setWhForm({ ...whForm, governanceChecklist: e.target.value })}
            />
          </label>
          <label>
            Facility notes
            <input
              placeholder="Optional"
              value={whForm.facilityNotes}
              onChange={(e) => setWhForm({ ...whForm, facilityNotes: e.target.value })}
            />
          </label>
        </div>
        <button type="submit" className="btn-primary insurance-panel__submit" disabled={busy}>
          Register warehouse
        </button>
      </form>

      {canOperate ? (
        <>
          <div className="coop-forms-grid">
          <form
              className="insurance-panel"
            onSubmit={async (e) => {
              e.preventDefault()
                setBusy(true)
              try {
                await addCoopMember(selectedId, Number(memberFarmerId))
                toast.success('Member added')
                setMemberFarmerId('')
                loadDash(selectedId)
              } catch (err) {
                  toast.error(err?.response?.data?.error || 'Could not add member')
                } finally {
                  setBusy(false)
                }
              }}
            >
              <div className="insurance-panel__head">
                <h2>Add farmer member</h2>
                <p className="muted">Register a farmer under this cooperative.</p>
              </div>
              <div className="insurance-panel__grid insurance-panel__grid--form">
                <label>
                  Farmer ID
            <input
                    required
                    inputMode="numeric"
                    placeholder="e.g. 12"
              value={memberFarmerId}
              onChange={(e) => setMemberFarmerId(e.target.value)}
            />
                </label>
              </div>
              <button type="submit" className="btn-primary insurance-panel__submit" disabled={busy}>
              Add member
            </button>
          </form>

          <form
              className="insurance-panel"
            onSubmit={async (e) => {
              e.preventDefault()
                setBusy(true)
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
                  setStorageForm({
                    farmerId: '',
                    commodity: '',
                    quantity: '',
                    grade: '',
                    binOrLot: '',
                  })
                loadDash(selectedId)
              } catch (err) {
                  toast.error(err?.response?.data?.error || 'Could not save storage')
                } finally {
                  setBusy(false)
                }
              }}
            >
              <div className="insurance-panel__head">
                <h2>Record storage lot</h2>
                <p className="muted">Track commodity held in the warehouse.</p>
              </div>
              <div className="insurance-panel__grid insurance-panel__grid--form">
                <label>
                  Farmer ID
            <input
                    placeholder="Optional"
              value={storageForm.farmerId}
              onChange={(e) => setStorageForm({ ...storageForm, farmerId: e.target.value })}
            />
                </label>
                <label>
                  Commodity
            <input
                    required
                    placeholder="e.g. Maize"
              value={storageForm.commodity}
              onChange={(e) => setStorageForm({ ...storageForm, commodity: e.target.value })}
            />
                </label>
                <label>
                  Quantity (kg)
            <input
                    required
                    inputMode="decimal"
                    placeholder="0"
              value={storageForm.quantity}
              onChange={(e) => setStorageForm({ ...storageForm, quantity: e.target.value })}
            />
                </label>
                <label>
                  Grade
            <input
                    placeholder="Optional"
              value={storageForm.grade}
              onChange={(e) => setStorageForm({ ...storageForm, grade: e.target.value })}
            />
                </label>
                <label>
                  Bin / lot
            <input
                    placeholder="Optional"
              value={storageForm.binOrLot}
              onChange={(e) => setStorageForm({ ...storageForm, binOrLot: e.target.value })}
            />
                </label>
              </div>
              <button type="submit" className="btn-primary insurance-panel__submit" disabled={busy}>
              Save storage
            </button>
          </form>

          <form
              className="insurance-panel"
            onSubmit={async (e) => {
              e.preventDefault()
                setBusy(true)
              try {
                const wh = dash?.warehouse
                await issueReceipt({
                  cooperativeName: wh?.cooperativeName || 'Cooperative',
                  cooperativeWarehouseId: selectedId,
                  farmerId: Number(receiptForm.farmerId),
                  commodity: receiptForm.commodity,
                  quantity: Number(receiptForm.quantity),
                  weightKg: receiptForm.weightKg
                    ? Number(receiptForm.weightKg)
                    : Number(receiptForm.quantity),
                  storageLocation: receiptForm.storageLocation || null,
                  grade: receiptForm.grade || null,
                  expiryDate: receiptForm.expiryDate || null,
                  status: 'active',
                })
                toast.success('Receipt issued')
                setReceiptForm({
                  farmerId: '',
                  commodity: '',
                  quantity: '',
                  weightKg: '',
                  storageLocation: '',
                  grade: '',
                  expiryDate: '',
                })
                loadDash(selectedId)
              } catch (err) {
                  toast.error(err?.response?.data?.error || 'Could not issue receipt')
                } finally {
                  setBusy(false)
                }
              }}
            >
              <div className="insurance-panel__head">
                <h2>Issue warehouse receipt</h2>
                <p className="muted">Create a receipt for stored produce.</p>
              </div>
              <div className="insurance-panel__grid insurance-panel__grid--form">
                <label>
                  Farmer ID
            <input
                    required
                    inputMode="numeric"
              value={receiptForm.farmerId}
              onChange={(e) => setReceiptForm({ ...receiptForm, farmerId: e.target.value })}
            />
                </label>
                <label>
                  Commodity
            <input
                    required
              value={receiptForm.commodity}
              onChange={(e) => setReceiptForm({ ...receiptForm, commodity: e.target.value })}
            />
                </label>
                <label>
                  Quantity
            <input
                    required
                    inputMode="decimal"
              value={receiptForm.quantity}
              onChange={(e) => setReceiptForm({ ...receiptForm, quantity: e.target.value })}
            />
                </label>
                <label>
                  Weight (kg)
            <input
                    inputMode="decimal"
                    placeholder="Defaults to quantity"
              value={receiptForm.weightKg}
              onChange={(e) => setReceiptForm({ ...receiptForm, weightKg: e.target.value })}
            />
                </label>
                <label>
                  Storage location
            <input
                    placeholder="Bin / bay"
              value={receiptForm.storageLocation}
                    onChange={(e) =>
                      setReceiptForm({ ...receiptForm, storageLocation: e.target.value })
                    }
            />
                </label>
                <label>
                  Grade
            <input
              value={receiptForm.grade}
              onChange={(e) => setReceiptForm({ ...receiptForm, grade: e.target.value })}
            />
                </label>
                <label>
                  Expiry date
            <input
              type="date"
                    required
              value={receiptForm.expiryDate}
              onChange={(e) => setReceiptForm({ ...receiptForm, expiryDate: e.target.value })}
            />
                </label>
              </div>
              <button type="submit" className="btn-primary insurance-panel__submit" disabled={busy}>
              Issue receipt
            </button>
          </form>

            <form
              className="insurance-panel"
              onSubmit={async (e) => {
                e.preventDefault()
                setBusy(true)
                try {
                  await updateCoopGovernance(selectedId, {
                    governanceChecklist: governance,
                    governanceVerified: true,
                  })
                  toast.success('Governance notes saved')
                  loadDash(selectedId)
                } catch (err) {
                  toast.error(err?.response?.data?.error || 'Could not save governance')
                } finally {
                  setBusy(false)
                }
              }}
            >
              <div className="insurance-panel__head">
                <h2>Governance notes</h2>
                <p className="muted">Board, bylaws, insurance, and grading standards.</p>
              </div>
              <label className="coop-textarea-field">
                Checklist
                <textarea
                  rows={5}
                  value={governance}
                  onChange={(e) => setGovernance(e.target.value)}
                  placeholder="Board minutes, bylaws, insurance cover, grading standard…"
                />
              </label>
              <button type="submit" className="btn-primary insurance-panel__submit" disabled={busy}>
                Save notes
              </button>
            </form>
        </div>

      {dash ? (
            <div className="coop-tables">
              <DataTableShell title="Members" footer={<span>{(dash.members || []).length} member(s)</span>}>
                <div className="table-scroll">
                  <table className="desktop-table dashboard-table">
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
                          <td colSpan={3} className="empty-cell">
                            No members yet.
                          </td>
                  </tr>
                ) : (
                  dash.members.map((m) => (
                    <tr key={m.membershipId}>
                      <td>#{m.farmerId}</td>
                            <td>
                              <StatusBadge value={m.status} />
                            </td>
                      <td>{m.joinedAt ? String(m.joinedAt).slice(0, 10) : '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
                </div>
          </DataTableShell>

              <DataTableShell title="Storage" footer={<span>{(dash.storage || []).length} lot(s)</span>}>
                <div className="table-scroll">
                  <table className="desktop-table dashboard-table">
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
                          <td colSpan={5} className="empty-cell">
                            No storage lots.
                          </td>
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
                            <td>
                              <StatusBadge value={s.status} />
                            </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
                </div>
          </DataTableShell>

              <DataTableShell
                title="Pending confirmations"
                footer={<span>{(dash.pendingCoopConfirmations || []).length} pending</span>}
              >
                <div className="table-scroll">
                  <table className="desktop-table dashboard-table">
              <thead>
                <tr>
                  <th>Loan</th>
                  <th>Farmer</th>
                  <th>Type</th>
                        <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {(dash.pendingCoopConfirmations || []).length === 0 ? (
                  <tr>
                          <td colSpan={4} className="empty-cell">
                            None pending.
                          </td>
                  </tr>
                ) : (
                  dash.pendingCoopConfirmations.map((loan) => (
                    <tr key={loan.inputLoanId}>
                      <td>#{loan.inputLoanId}</td>
                      <td>#{loan.farmerId}</td>
                      <td>{loan.inputType}</td>
                            <td className="action-cell">
                        <button
                          type="button"
                          className="btn-primary"
                                disabled={busy}
                          onClick={async () => {
                                  setBusy(true)
                            try {
                              await confirmInputLoanByCoop(loan.inputLoanId, operatorUserId)
                              toast.success('Input loan confirmed')
                              loadDash(selectedId)
                            } catch (err) {
                              toast.error(err?.response?.data?.error || 'Confirm failed')
                                  } finally {
                                    setBusy(false)
                            }
                          }}
                        >
                                Confirm
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
                </div>
          </DataTableShell>

              <DataTableShell
                title="Pending deliveries"
                footer={<span>{(dash.pendingInputDeliveries || []).length} pending</span>}
              >
                <div className="table-scroll">
                  <table className="desktop-table dashboard-table">
              <thead>
                <tr>
                  <th>Loan</th>
                  <th>Farmer</th>
                  <th>Type</th>
                        <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {(dash.pendingInputDeliveries || []).length === 0 ? (
                  <tr>
                          <td colSpan={4} className="empty-cell">
                            None pending.
                          </td>
                  </tr>
                ) : (
                  dash.pendingInputDeliveries.map((loan) => (
                    <tr key={loan.inputLoanId}>
                      <td>#{loan.inputLoanId}</td>
                      <td>#{loan.farmerId}</td>
                      <td>{loan.inputType}</td>
                            <td className="action-cell">
                        <button
                          type="button"
                          className="btn-primary"
                                disabled={busy}
                          onClick={async () => {
                                  setBusy(true)
                            try {
                              await deliverInputLoan(loan.inputLoanId)
                              toast.success('Delivery confirmed')
                              loadDash(selectedId)
                            } catch (err) {
                              toast.error(err?.response?.data?.error || 'Deliver failed')
                                  } finally {
                                    setBusy(false)
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
                </div>
          </DataTableShell>
        </div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}

export default CooperativeDashboardPage
