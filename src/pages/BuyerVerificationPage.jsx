import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { apiClient } from '../api/client'
import { usePageCopy } from '../context/AuthLocaleContext'
import { formatRwf } from '../utils/currency'

function BuyerVerificationPage() {
  const { p } = usePageCopy('buyerVerification')
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
        data.status === 'verified'
          || data.status === 'disputed'
          || data.status === 'field_inspection_pending'
          ? data.status
          : '',
      )
    } catch {
      toast.error(p.loadFailed)
      setForm(null)
    }
  }

  useEffect(() => {
    if (contractId) loadForm(contractId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId])

  const start = async () => {
    if (!contractId) return toast.error(p.contractIdRequired)
    setBusy(true)
    try {
      const { data } = await apiClient.post(`/contracts/${contractId}/buyer-consent/start`)
      setDemoOtp(data.otpCode || '')
      setVerifyLink(data.verificationLink || verifyLink)
      const channels = (data.channels || []).join(', ')
      toast.success(p.verificationSent(channels))
      loadForm(contractId)
    } catch (e) {
      toast.error(e?.response?.data?.error || p.startFailed)
    } finally {
      setBusy(false)
    }
  }

  const decide = async (decision) => {
    if (!contractId) return toast.error(p.contractIdRequired)
    if (decision === 'confirmed') {
      if (!confirmName || !confirmQuantity || !confirmValue || !confirmTerms) {
        return toast.error(p.confirmAll)
      }
      if (!otp) return toast.error(p.enterOtp)
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
      toast.success(data.message || p.verificationComplete(data.status))
      loadForm(contractId)
    } catch (e) {
      toast.error(e?.response?.data?.error || p.decisionFailed)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-[var(--surface-page,#f8faf5)] p-6">
      <h1 className="text-2xl font-bold text-[var(--brand,#00450d)]">{p.title}</h1>
      <p className="mt-2 text-sm text-slate-600">{p.subtitle}</p>

      <label className="mt-6 block text-xs font-semibold text-slate-500">{p.contractId}</label>
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
        {p.loadContract}
      </button>

      {form ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <p>
            <strong>{p.statusLabel}</strong> {form.status}
          </p>
          <p className="mt-2">
            <strong>{p.buyerName}</strong> {form.buyerName || '—'}
          </p>
          <p>
            <strong>{p.quantity}</strong> {form.quantity ?? '—'}
          </p>
          <p>
            <strong>{p.contractValue}</strong> {formatRwf(form.contractValue)}
          </p>
          <p>
            <strong>{p.paymentTerms}</strong> {form.paymentTerms || '—'}
          </p>
          {form.designatedAccount ? (
            <p className="mt-2 text-slate-600">
              {p.payInto} {form.designatedAccount}
            </p>
          ) : null}
        </div>
      ) : null}

      {doneStatus === 'verified'
      || doneStatus === 'disputed'
      || doneStatus === 'field_inspection_pending' ? (
        <p className="mt-6 rounded-xl bg-white p-4 text-center font-semibold text-[var(--brand,#00450d)]">
          {doneStatus === 'field_inspection_pending'
            ? p.thankYouInspection
            : p.verificationComplete(doneStatus)}
        </p>
      ) : (
        <>
          <button type="button" className="btn-primary mt-4 w-full" disabled={busy} onClick={start}>
            {p.sendOtp}
          </button>
          {verifyLink ? (
            <p className="mt-2 break-all text-center text-xs text-slate-500">{verifyLink}</p>
          ) : null}
          {demoOtp ? (
            <p className="mt-2 text-center text-sm text-slate-500">{p.demoOtp(demoOtp)}</p>
          ) : null}

          <div className="mt-6 space-y-3 text-sm">
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={confirmName} onChange={(e) => setConfirmName(e.target.checked)} />
              <span>{p.confirmName}</span>
            </label>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={confirmQuantity}
                onChange={(e) => setConfirmQuantity(e.target.checked)}
              />
              <span>{p.confirmQuantity}</span>
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={confirmValue} onChange={(e) => setConfirmValue(e.target.checked)} />
              <span>{p.confirmValue}</span>
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={confirmTerms} onChange={(e) => setConfirmTerms(e.target.checked)} />
              <span>{p.confirmTerms}</span>
            </label>
          </div>

          <label className="mt-6 block text-xs font-semibold text-slate-500">{p.otpLabel}</label>
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-center text-lg tracking-widest"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            inputMode="numeric"
            placeholder={p.otpPlaceholder}
          />

          <button
            type="button"
            className="btn-primary mt-4 w-full"
            disabled={busy}
            onClick={() => decide('confirmed')}
          >
            {p.confirmVerify}
          </button>
          <button
            type="button"
            className="btn-secondary mt-2 w-full"
            disabled={busy}
            onClick={() => decide('disputed')}
          >
            {p.dispute}
          </button>
        </>
      )}
    </div>
  )
}

export default BuyerVerificationPage
