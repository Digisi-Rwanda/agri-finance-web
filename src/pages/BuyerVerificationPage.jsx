import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { apiClient } from '../api/client'

/**
 * Mobile-first buyer verification form (Spec v2 Section 5).
 * Short form: confirm contract + OTP consent for non-payment-to-farmer.
 * Public path uses authenticated session for MVP; SMS deep-link can pass contractId.
 */
function BuyerVerificationPage() {
  const [params] = useSearchParams()
  const [contractId, setContractId] = useState(params.get('contractId') || '')
  const [otp, setOtp] = useState('')
  const [demoOtp, setDemoOtp] = useState('')
  const [busy, setBusy] = useState(false)

  const start = async () => {
    if (!contractId) return toast.error('Contract ID required')
    setBusy(true)
    try {
      const { data } = await apiClient.post(`/contracts/${contractId}/buyer-consent/start`)
      setDemoOtp(data.otpCode || '')
      toast.success('OTP generated for buyer')
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed')
    } finally {
      setBusy(false)
    }
  }

  const verify = async () => {
    if (!contractId || !otp) return toast.error('Contract ID and OTP required')
    setBusy(true)
    try {
      await apiClient.post(`/contracts/${contractId}/buyer-consent/verify`, { otp })
      toast.success('Consent recorded. Contract moves to field inspection.')
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Invalid OTP')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-[var(--surface-page,#f8faf5)] p-6">
      <h1 className="text-2xl font-bold text-[var(--brand,#00450d)]">Buyer verification</h1>
      <p className="mt-2 text-sm text-slate-600">
        Confirm this purchase contract. You agree you will <strong>not</strong> pay the farmer
        directly — you will pay into the Digisi designated account.
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
        className="btn-primary mt-4 w-full"
        disabled={busy}
        onClick={start}
      >
        Get OTP consent code
      </button>

      {demoOtp ? (
        <p className="mt-2 text-center text-sm text-slate-500">Demo OTP: {demoOtp}</p>
      ) : null}

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
        onClick={verify}
      >
        I confirm — will not pay farmer directly
      </button>
    </div>
  )
}

export default BuyerVerificationPage
