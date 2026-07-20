import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { apiClient } from '../api/client'
import { formatRwf } from '../utils/currency'

/**
 * Public buyer verification: confirm name/qty/value/terms + OTP, or dispute.
 */
function BuyerVerificationPage() {
  const [params] = useSearchParams()
  const [contractId, setContractId] = useState(params.get('contractId') || '')
  const [form, setForm] = useState(null)
  const [otp, setOtp] = useState('')
  const [demoOtp, setDemoOtp] = useState('')
  const [verifyLink, setVerifyLink] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmName, setConfirmName] = useState(false)
  const [confirmQuantity, setConfirmQuantity] = useState(false)
  const [confirmValue, setConfirmValue] = useState(false)
  const [confirmTerms, setConfirmTerms] = useState(false)
  const [doneStatus, setDoneStatus] = useState('')

  const loadForm = async (id) => {
    if (!id) return
    try {
      const { data } = await apiClient.get(`/contracts/${id}/buyer-form`)
      setForm(data)
      setVerifyLink(data.verificationLink || '')
      setDoneStatus(
        data.status === 'verified' || data.status === 'disputed' ? data.status : '',
      )
    } catch {
      toast.error('Contract not found')
      setForm(null)
    }
  }

  useEffect(() => {
    if (contractId) loadForm(contractId)
  }, [contractId])

  const start = async () => {
    if (!contractId) return toast.error('Contract ID required')
    setBusy(true)
    try {
      const { data } = await apiClient.post(`/contracts/${contractId}/buyer-consent/start`)
      setDemoOtp(data.otpCode || '')
      setVerifyLink(data.verificationLink || verifyLink)
      const channels = (data.channels || []).join(', ')
      toast.success(`Verification sent (${channels || 'web link'})`)
      loadForm(contractId)
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to start verification')
    } finally {
      setBusy(false)
    }
  }

  const decide = async (decision) => {
    if (!contractId) return toast.error('Contract ID required')
    if (decision === 'confirmed') {
      if (!confirmName || !confirmQuantity || !confirmValue || !confirmTerms) {
        return toast.error('Tick all confirmation boxes')
      }
      if (!otp) return toast.error('Enter OTP from SMS/email')
    }
    setBusy(true)
    try {
      const { data } = await apiClient.post(`/contracts/${contractId}/buyer-decide`, {
        decision,
        otp,
        confirmName,
        confirmQuantity,
        confirmValue,
        confirmTerms,
      })
      setDoneStatus(data.status)
      toast.success(data.message || `Status: ${data.status}`)
      loadForm(contractId)
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Decision failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-[var(--surface-page,#f8faf5)] p-6">
      <h1 className="text-2xl font-bold text-[var(--brand,#00450d)]">Buyer verification</h1>
      <p className="mt-2 text-sm text-slate-600">
        Confirm the purchase contract details below, or dispute if anything is wrong. You also
        confirm you will <strong>not</strong> pay the farmer directly.
      </p>

      <label className="mt-6 block text-xs font-semibold text-slate-500">Contract ID</label>
      <input
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3"
        value={contractId}
        onChange={(e) => setContractId(e.target.value)}
        inputMode="numeric"
      />
      <button
        type="button"
        className="btn-secondary mt-2 w-full"
        disabled={busy}
        onClick={() => loadForm(contractId)}
      >
        Load contract
      </button>

      {form ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <p>
            <strong>Status:</strong> {form.status}
          </p>
          <p className="mt-2">
            <strong>Buyer name:</strong> {form.buyerName || '—'}
          </p>
          <p>
            <strong>Quantity:</strong> {form.quantity ?? '—'}
          </p>
          <p>
            <strong>Contract value:</strong> {formatRwf(form.contractValue)}
          </p>
          <p>
            <strong>Payment terms:</strong> {form.paymentTerms || '—'}
          </p>
          {form.designatedAccount ? (
            <p className="mt-2 text-slate-600">Pay into: {form.designatedAccount}</p>
          ) : null}
        </div>
      ) : null}

      {doneStatus === 'verified' || doneStatus === 'disputed' ? (
        <p className="mt-6 rounded-xl bg-white p-4 text-center font-semibold text-[var(--brand,#00450d)]">
          Verification complete: {doneStatus}
        </p>
      ) : (
        <>
          <button type="button" className="btn-primary mt-4 w-full" disabled={busy} onClick={start}>
            Send OTP (SMS / email / web link)
          </button>
          {verifyLink ? (
            <p className="mt-2 break-all text-center text-xs text-slate-500">{verifyLink}</p>
          ) : null}
          {demoOtp ? (
            <p className="mt-2 text-center text-sm text-slate-500">Demo OTP: {demoOtp}</p>
          ) : null}

          <div className="mt-6 space-y-3 text-sm">
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={confirmName} onChange={(e) => setConfirmName(e.target.checked)} />
              <span>I confirm the buyer name is correct</span>
            </label>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={confirmQuantity}
                onChange={(e) => setConfirmQuantity(e.target.checked)}
              />
              <span>I confirm the quantity is correct</span>
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={confirmValue} onChange={(e) => setConfirmValue(e.target.checked)} />
              <span>I confirm the contract value is correct</span>
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={confirmTerms} onChange={(e) => setConfirmTerms(e.target.checked)} />
              <span>I confirm the payment terms are correct</span>
            </label>
          </div>

          <label className="mt-6 block text-xs font-semibold text-slate-500">OTP</label>
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-center text-lg tracking-widest"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            inputMode="numeric"
            placeholder="6 digits"
          />

          <button
            type="button"
            className="btn-primary mt-4 w-full"
            disabled={busy}
            onClick={() => decide('confirmed')}
          >
            Confirm — verify contract
          </button>
          <button
            type="button"
            className="btn-secondary mt-2 w-full"
            disabled={busy}
            onClick={() => decide('disputed')}
          >
            Dispute details
          </button>
        </>
      )}
    </div>
  )
}

export default BuyerVerificationPage
