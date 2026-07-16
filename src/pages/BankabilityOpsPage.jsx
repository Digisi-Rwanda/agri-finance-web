import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import DataTableShell from '../components/ui/DataTableShell'
import {
  createBankProduct,
  createSettlement,
  issueReceipt,
  listBankProducts,
  listBanks,
  listExpiringReceipts,
  listGuaranteeClaims,
  listPaymentWatches,
  listSettlements,
  openGuaranteeClaim,
  updateGuaranteeClaim,
} from '../services/bankabilityService'

/**
 * Admin bankability ops: bank products, settlements, guarantees, collateral expiry.
 * Comment: consolidates proposal items #4, #5, #7, #12, #13 into one staff page.
 */
function BankabilityOpsPage() {
  const [products, setProducts] = useState([])
  const [banks, setBanks] = useState([])
  const [settlements, setSettlements] = useState([])
  const [claims, setClaims] = useState([])
  const [watches, setWatches] = useState([])
  const [expiring, setExpiring] = useState([])
  const [loading, setLoading] = useState(true)

  // Simple create forms
  const [productForm, setProductForm] = useState({
    bankId: '',
    productName: '',
    maxAmount: '',
    maxTenorMonths: '12',
    preferredCollateral: 'combined',
  })
  const [settleForm, setSettleForm] = useState({
    cooperativeName: '',
    farmerId: '',
    saleAmount: '',
    inputLoanBalance: '',
  })
  const [receiptForm, setReceiptForm] = useState({
    cooperativeName: '',
    farmerId: '',
    commodity: '',
    quantity: '',
    grade: 'Grade 1',
    expiryDate: '',
  })
  const [claimForm, setClaimForm] = useState({ loanId: '', claimAmount: '', coveragePercent: '50' })

  const load = async () => {
    setLoading(true)
    try {
      const [p, b, s, c, w, e] = await Promise.all([
        listBankProducts(),
        listBanks(),
        listSettlements(),
        listGuaranteeClaims(),
        listPaymentWatches('watching'),
        listExpiringReceipts(30),
      ])
      setProducts(Array.isArray(p) ? p : [])
      setBanks(Array.isArray(b) ? b : [])
      setSettlements(Array.isArray(s) ? s : [])
      setClaims(Array.isArray(c) ? c : [])
      setWatches(Array.isArray(w) ? w : [])
      setExpiring(Array.isArray(e) ? e : [])
      if (!productForm.bankId && b?.[0]) {
        setProductForm((f) => ({ ...f, bankId: String(b[0].bankId) }))
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to load bankability data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onCreateProduct = async (e) => {
    e.preventDefault()
    try {
      await createBankProduct({
        bankId: Number(productForm.bankId),
        productName: productForm.productName,
        maxAmount: productForm.maxAmount ? Number(productForm.maxAmount) : null,
        maxTenorMonths: Number(productForm.maxTenorMonths) || 12,
        preferredCollateral: productForm.preferredCollateral,
        guaranteePreferred: true,
        active: true,
      })
      toast.success('Bank product created')
      setProductForm((f) => ({ ...f, productName: '', maxAmount: '' }))
      load()
    } catch (err) {
      toast.error('Could not create product')
    }
  }

  const onSettlement = async (e) => {
    e.preventDefault()
    try {
      await createSettlement({
        cooperativeName: settleForm.cooperativeName,
        farmerId: Number(settleForm.farmerId),
        saleAmount: Number(settleForm.saleAmount),
        inputLoanBalance: Number(settleForm.inputLoanBalance || 0),
      })
      toast.success('Settlement recorded (deduction auto-calculated)')
      setSettleForm({ cooperativeName: '', farmerId: '', saleAmount: '', inputLoanBalance: '' })
      load()
    } catch (err) {
      toast.error('Settlement failed')
    }
  }

  const onReceipt = async (e) => {
    e.preventDefault()
    try {
      await issueReceipt({
        cooperativeName: receiptForm.cooperativeName,
        farmerId: Number(receiptForm.farmerId),
        commodity: receiptForm.commodity,
        quantity: Number(receiptForm.quantity),
        grade: receiptForm.grade,
        expiryDate: receiptForm.expiryDate || null,
        status: 'active',
      })
      toast.success('Warehouse receipt issued')
      setReceiptForm({
        cooperativeName: '',
        farmerId: '',
        commodity: '',
        quantity: '',
        grade: 'Grade 1',
        expiryDate: '',
      })
      load()
    } catch (err) {
      toast.error('Could not issue receipt')
    }
  }

  const onClaim = async (e) => {
    e.preventDefault()
    try {
      await openGuaranteeClaim({
        loanId: Number(claimForm.loanId),
        claimAmount: Number(claimForm.claimAmount),
        coveragePercent: Number(claimForm.coveragePercent),
        guaranteeBody: 'BDF/RDB',
        status: 'pending',
      })
      toast.success('Guarantee claim opened')
      setClaimForm({ loanId: '', claimAmount: '', coveragePercent: '50' })
      load()
    } catch (err) {
      toast.error('Could not open claim')
    }
  }

  return (
    <section className="dashboard-page">
      <PageHeader
        breadcrumb="Bankability › Operations"
        title="Bankability operations"
        subtitle="Bank products, coop settlements, warehouse receipts, payment watch, and guarantee claims."
        actions={
          <button type="button" className="btn-primary" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />

      <div className="widgets four">
        <StatCard title="Bank products" value={String(products.length)} />
        <StatCard title="Open payment watches" value={String(watches.length)} />
        <StatCard title="Receipts expiring (30d)" value={String(expiring.length)} />
        <StatCard title="Guarantee claims" value={String(claims.length)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <form onSubmit={onCreateProduct} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
          <h3 className="font-semibold">Add bank product</h3>
          <select
            className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
            value={productForm.bankId}
            onChange={(e) => setProductForm({ ...productForm, bankId: e.target.value })}
            required
          >
            <option value="">Select bank</option>
            {banks.map((b) => (
              <option key={b.bankId} value={b.bankId}>
                {b.bankName}
              </option>
            ))}
          </select>
          <input
            className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
            placeholder="Product name"
            value={productForm.productName}
            onChange={(e) => setProductForm({ ...productForm, productName: e.target.value })}
            required
          />
          <input
            className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
            placeholder="Max amount (RWF)"
            value={productForm.maxAmount}
            onChange={(e) => setProductForm({ ...productForm, maxAmount: e.target.value })}
          />
          <input
            className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
            placeholder="Max tenor (months)"
            value={productForm.maxTenorMonths}
            onChange={(e) => setProductForm({ ...productForm, maxTenorMonths: e.target.value })}
          />
          <button type="submit" className="btn-primary">
            Save product
          </button>
        </form>

        <form onSubmit={onSettlement} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
          <h3 className="font-semibold">Record coop settlement</h3>
          <input
            className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
            placeholder="Cooperative name"
            value={settleForm.cooperativeName}
            onChange={(e) => setSettleForm({ ...settleForm, cooperativeName: e.target.value })}
            required
          />
          <input
            className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
            placeholder="Farmer ID"
            value={settleForm.farmerId}
            onChange={(e) => setSettleForm({ ...settleForm, farmerId: e.target.value })}
            required
          />
          <input
            className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
            placeholder="Sale amount"
            value={settleForm.saleAmount}
            onChange={(e) => setSettleForm({ ...settleForm, saleAmount: e.target.value })}
            required
          />
          <input
            className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
            placeholder="Open input-loan balance"
            value={settleForm.inputLoanBalance}
            onChange={(e) => setSettleForm({ ...settleForm, inputLoanBalance: e.target.value })}
          />
          <button type="submit" className="btn-primary">
            Record settlement
          </button>
        </form>

        <form onSubmit={onReceipt} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
          <h3 className="font-semibold">Issue warehouse receipt</h3>
          <input
            className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
            placeholder="Cooperative name"
            value={receiptForm.cooperativeName}
            onChange={(e) => setReceiptForm({ ...receiptForm, cooperativeName: e.target.value })}
            required
          />
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
            type="date"
            className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
            value={receiptForm.expiryDate}
            onChange={(e) => setReceiptForm({ ...receiptForm, expiryDate: e.target.value })}
          />
          <button type="submit" className="btn-primary">
            Issue receipt
          </button>
        </form>

        <form onSubmit={onClaim} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
          <h3 className="font-semibold">Open guarantee claim</h3>
          <input
            className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
            placeholder="Loan ID"
            value={claimForm.loanId}
            onChange={(e) => setClaimForm({ ...claimForm, loanId: e.target.value })}
            required
          />
          <input
            className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
            placeholder="Claim amount"
            value={claimForm.claimAmount}
            onChange={(e) => setClaimForm({ ...claimForm, claimAmount: e.target.value })}
            required
          />
          <input
            className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
            placeholder="Coverage %"
            value={claimForm.coveragePercent}
            onChange={(e) => setClaimForm({ ...claimForm, coveragePercent: e.target.value })}
          />
          <button type="submit" className="btn-primary">
            Open claim
          </button>
        </form>
      </div>

      <div className="mt-6 space-y-6">
        <DataTableShell title="Bank products">
          <table className="data-table">
            <thead>
              <tr>
                <th>Bank</th>
                <th>Product</th>
                <th>Max</th>
                <th>Tenor</th>
                <th>Collateral</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.productId}>
                  <td>#{p.bankId}</td>
                  <td>{p.productName}</td>
                  <td>{p.maxAmount ?? '—'}</td>
                  <td>{p.maxTenorMonths ?? '—'} mo</td>
                  <td>{p.preferredCollateral || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>

        <DataTableShell title="Recent settlements">
          <table className="data-table">
            <thead>
              <tr>
                <th>Coop</th>
                <th>Farmer</th>
                <th>Sale</th>
                <th>Deducted</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>
              {settlements.slice(0, 20).map((s) => (
                <tr key={s.settlementId}>
                  <td>{s.cooperativeName}</td>
                  <td>#{s.farmerId}</td>
                  <td>{s.saleAmount}</td>
                  <td>{s.deductedAmount}</td>
                  <td>{s.netToFarmer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>

        <DataTableShell title="Guarantee claims">
          <table className="data-table">
            <thead>
              <tr>
                <th>Loan</th>
                <th>Body</th>
                <th>Amount</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {claims.map((c) => (
                <tr key={c.claimId}>
                  <td>#{c.loanId}</td>
                  <td>{c.guaranteeBody}</td>
                  <td>{c.claimAmount}</td>
                  <td>{c.status}</td>
                  <td>
                    {c.status === 'pending' ? (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={async () => {
                          await updateGuaranteeClaim(c.claimId, {
                            status: 'approved',
                            referenceNumber: `BDF-${c.claimId}`,
                          })
                          toast.success('Claim approved')
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

        <DataTableShell title="Collateral expiring within 30 days">
          <table className="data-table">
            <thead>
              <tr>
                <th>Receipt</th>
                <th>Farmer</th>
                <th>Commodity</th>
                <th>Expiry</th>
              </tr>
            </thead>
            <tbody>
              {expiring.length === 0 ? (
                <tr>
                  <td colSpan={4}>No expiring receipts.</td>
                </tr>
              ) : (
                expiring.map((r) => (
                  <tr key={r.receiptId}>
                    <td>#{r.receiptId}</td>
                    <td>#{r.farmerId}</td>
                    <td>{r.commodity}</td>
                    <td>{r.expiryDate}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </DataTableShell>
      </div>
    </section>
  )
}

export default BankabilityOpsPage
