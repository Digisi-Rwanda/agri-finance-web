import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import DataTableShell from '../components/ui/DataTableShell'
import {
  applyWarehouse,
  attachInputInsurance,
  createBank,
  decideGuaranteeRequest,
  decideWarehouse,
  deliverInputLoan,
  exportLoanPackage,
  listBanks,
  listGuaranteeRequests,
  listInputLoans,
  listWarehouses,
  registerInputLoan,
  suggestLoanPackage,
  updateBank,
} from '../services/bankabilityService'
import { exportLoanPackagePdf } from '../utils/exportPdf'

/**
 * Spec v2 Phase 2/3 admin ops + PDF loan package export + bank CRUD.
 */
function SpecV2OpsPage() {
  const [warehouses, setWarehouses] = useState([])
  const [inputLoans, setInputLoans] = useState([])
  const [guarantees, setGuarantees] = useState([])
  const [banks, setBanks] = useState([])
  const [loading, setLoading] = useState(true)
  const [farmerIdForSuggest, setFarmerIdForSuggest] = useState('')
  const [whForm, setWhForm] = useState({
    cooperativeName: '',
    location: '',
    storageInsuranceRef: '',
    facilityNotes: '',
    governanceChecklist: '',
  })
  const [inputForm, setInputForm] = useState({
    farmerId: '',
    cooperativeName: '',
    inputType: 'fertilizer',
    quantityOrValue: '',
    insuranceReferenceId: '',
  })
  const [bankForm, setBankForm] = useState({
    bankName: '',
    integrationStatus: 'not_integrated',
    contactInfo: '',
  })

  const load = async () => {
    setLoading(true)
    try {
      const [w, i, g, b] = await Promise.all([
        listWarehouses(),
        listInputLoans(),
        listGuaranteeRequests(),
        listBanks(),
      ])
      setWarehouses(Array.isArray(w) ? w : [])
      setInputLoans(Array.isArray(i) ? i : [])
      setGuarantees(Array.isArray(g) ? g : [])
      setBanks(Array.isArray(b) ? b : [])
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to load Spec v2 ops')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const onSuggestPdf = async () => {
    try {
      const pkg = await suggestLoanPackage(Number(farmerIdForSuggest))
      const full = await exportLoanPackage(pkg.packageId)
      exportLoanPackagePdf(full)
      toast.success(`Package #${pkg.packageId} PDF downloaded`)
      load()
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Suggest/export failed')
    }
  }

  return (
    <section className="dashboard-page">
      <PageHeader
        breadcrumb="Bankability › Spec v2"
        title="Spec v2 operations"
        subtitle="Warehouse onboarding, input loans, guarantee requests, bank registry, and PDF loan packages."
        actions={
          <button type="button" className="btn-primary" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />

      <div className="widgets four">
        <StatCard title="Warehouses" value={String(warehouses.length)} />
        <StatCard title="Input loans" value={String(inputLoans.length)} />
        <StatCard title="Guarantee requests" value={String(guarantees.length)} />
        <StatCard title="Partner banks" value={String(banks.length)} />
      </div>

      <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h3 className="mb-2 font-semibold">Export loan package PDF (Feature 4)</h3>
        <div className="flex flex-wrap gap-2">
          <input
            className="rounded-lg border border-[var(--border)] bg-transparent p-2"
            placeholder="Farmer ID"
            value={farmerIdForSuggest}
            onChange={(e) => setFarmerIdForSuggest(e.target.value)}
          />
          <button type="button" className="btn-primary" onClick={onSuggestPdf}>
            Suggest + download PDF
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <form
          className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
          onSubmit={async (e) => {
            e.preventDefault()
            try {
              await applyWarehouse({ ...whForm, approvalStatus: 'pending' })
              toast.success('Warehouse application submitted')
              setWhForm({
                cooperativeName: '',
                location: '',
                storageInsuranceRef: '',
                facilityNotes: '',
                governanceChecklist: '',
              })
              load()
            } catch {
              toast.error('Could not apply warehouse')
            }
          }}
        >
          <h3 className="font-semibold">Cooperative warehouse application</h3>
          <input
            className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
            placeholder="Cooperative name"
            value={whForm.cooperativeName}
            onChange={(e) => setWhForm({ ...whForm, cooperativeName: e.target.value })}
            required
          />
          <input
            className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
            placeholder="Location"
            value={whForm.location}
            onChange={(e) => setWhForm({ ...whForm, location: e.target.value })}
          />
          <input
            className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
            placeholder="Storage insurance reference (required to approve)"
            value={whForm.storageInsuranceRef}
            onChange={(e) => setWhForm({ ...whForm, storageInsuranceRef: e.target.value })}
          />
          <textarea
            className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
            placeholder="Governance checklist (board, bylaws, insurance, grading — required to approve)"
            rows={3}
            value={whForm.governanceChecklist}
            onChange={(e) => setWhForm({ ...whForm, governanceChecklist: e.target.value })}
          />
          <textarea
            className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
            placeholder="Facility / governance notes"
            value={whForm.facilityNotes}
            onChange={(e) => setWhForm({ ...whForm, facilityNotes: e.target.value })}
          />
          <button type="submit" className="btn-primary">
            Submit for admin review
          </button>
        </form>

        <form
          className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
          onSubmit={async (e) => {
            e.preventDefault()
            try {
              await registerInputLoan({
                farmerId: Number(inputForm.farmerId),
                cooperativeName: inputForm.cooperativeName,
                inputType: inputForm.inputType,
                quantityOrValue: Number(inputForm.quantityOrValue),
                insuranceReferenceId: inputForm.insuranceReferenceId || null,
              })
              toast.success('Input loan registered')
              setInputForm({
                farmerId: '',
                cooperativeName: '',
                inputType: 'fertilizer',
                quantityOrValue: '',
                insuranceReferenceId: '',
              })
              load()
            } catch {
              toast.error('Registration failed')
            }
          }}
        >
          <h3 className="font-semibold">Register in-kind input loan</h3>
          <input
            className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
            placeholder="Farmer ID"
            value={inputForm.farmerId}
            onChange={(e) => setInputForm({ ...inputForm, farmerId: e.target.value })}
            required
          />
          <input
            className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
            placeholder="Cooperative name"
            value={inputForm.cooperativeName}
            onChange={(e) => setInputForm({ ...inputForm, cooperativeName: e.target.value })}
          />
          <select
            className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
            value={inputForm.inputType}
            onChange={(e) => setInputForm({ ...inputForm, inputType: e.target.value })}
          >
            <option value="fertilizer">Fertilizer</option>
            <option value="seed">Seed</option>
          </select>
          <input
            className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
            placeholder="Quantity / value"
            value={inputForm.quantityOrValue}
            onChange={(e) => setInputForm({ ...inputForm, quantityOrValue: e.target.value })}
            required
          />
          <input
            className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
            placeholder="Insurance reference (required to deliver)"
            value={inputForm.insuranceReferenceId}
            onChange={(e) => setInputForm({ ...inputForm, insuranceReferenceId: e.target.value })}
          />
          <button type="submit" className="btn-primary">
            Register
          </button>
        </form>

        <form
          className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
          onSubmit={async (e) => {
            e.preventDefault()
            try {
              await createBank({ ...bankForm, active: true })
              toast.success('Bank added')
              setBankForm({ bankName: '', integrationStatus: 'not_integrated', contactInfo: '' })
              load()
            } catch {
              toast.error('Could not create bank')
            }
          }}
        >
          <h3 className="font-semibold">Add partner bank</h3>
          <input
            className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
            placeholder="Bank name"
            value={bankForm.bankName}
            onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
            required
          />
          <select
            className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
            value={bankForm.integrationStatus}
            onChange={(e) => setBankForm({ ...bankForm, integrationStatus: e.target.value })}
          >
            <option value="not_integrated">not_integrated (PDF bridge)</option>
            <option value="api_integrated">api_integrated</option>
          </select>
          <input
            className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
            placeholder="Contact info"
            value={bankForm.contactInfo}
            onChange={(e) => setBankForm({ ...bankForm, contactInfo: e.target.value })}
          />
          <button type="submit" className="btn-primary">
            Save bank
          </button>
        </form>
      </div>

      <div className="mt-6 space-y-6">
        <DataTableShell title="Warehouse applications">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Location</th>
                <th>Insurance</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {warehouses.map((w) => (
                <tr key={w.warehouseId}>
                  <td>{w.cooperativeName}</td>
                  <td>{w.location || '—'}</td>
                  <td>{w.storageInsuranceRef || '—'}</td>
                  <td>{w.approvalStatus}</td>
                  <td className="flex gap-2">
                    {w.approvalStatus === 'pending' ? (
                      <>
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={async () => {
                            try {
                              await decideWarehouse(w.warehouseId, 'approved')
                              toast.success('Approved')
                              load()
                            } catch (e) {
                              toast.error(e?.response?.data?.error || 'Need storage insurance ref')
                            }
                          }}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={async () => {
                            await decideWarehouse(w.warehouseId, 'rejected')
                            load()
                          }}
                        >
                          Reject
                        </button>
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>

        <DataTableShell title="Input loans">
          <table className="data-table">
            <thead>
              <tr>
                <th>Farmer</th>
                <th>Type</th>
                <th>Value</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {inputLoans.map((l) => (
                <tr key={l.inputLoanId}>
                  <td>#{l.farmerId}</td>
                  <td>{l.inputType}</td>
                  <td>{l.quantityOrValue}</td>
                  <td>{l.status}</td>
                  <td className="flex gap-2">
                    {l.status === 'pending_insurance' ? (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={async () => {
                          const ref = window.prompt('Insurance reference')
                          if (!ref) return
                          await attachInputInsurance(l.inputLoanId, ref)
                          toast.success('Insurance attached')
                          load()
                        }}
                      >
                        Attach insurance
                      </button>
                    ) : null}
                    {l.status === 'approved' ? (
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={async () => {
                          try {
                            await deliverInputLoan(l.inputLoanId)
                            toast.success('Delivery confirmed')
                            load()
                          } catch (e) {
                            toast.error(e?.response?.data?.error || 'Delivery blocked')
                          }
                        }}
                      >
                        Confirm delivery
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>

        <DataTableShell title="Guarantee requests (origination)">
          <table className="data-table">
            <thead>
              <tr>
                <th>Package</th>
                <th>Body</th>
                <th>%</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {guarantees.map((g) => (
                <tr key={g.guaranteeRequestId}>
                  <td>#{g.loanRequestPackageId}</td>
                  <td>{g.guaranteeBodyName}</td>
                  <td>{g.coveragePercentage}</td>
                  <td>{g.status}</td>
                  <td>
                    {g.status === 'pending' ? (
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={async () => {
                          await decideGuaranteeRequest(g.guaranteeRequestId, {
                            status: 'approved',
                            referenceNumber: `BDF-${g.guaranteeRequestId}`,
                            coveragePercentage: g.coveragePercentage || 50,
                          })
                          toast.success('Guarantee approved')
                          load()
                        }}
                      >
                        Approve
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>

        <DataTableShell title="Partner banks">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Integration</th>
                <th>Contact</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {banks.map((b) => (
                <tr key={b.bankId}>
                  <td>{b.bankName}</td>
                  <td>{b.integrationStatus || 'not_integrated'}</td>
                  <td>{b.contactInfo || '—'}</td>
                  <td>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={async () => {
                        const next =
                          b.integrationStatus === 'api_integrated' ? 'not_integrated' : 'api_integrated'
                        await updateBank(b.bankId, { integrationStatus: next })
                        toast.success(`Set ${next}`)
                        load()
                      }}
                    >
                      Toggle API
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </div>
    </section>
  )
}

export default SpecV2OpsPage
