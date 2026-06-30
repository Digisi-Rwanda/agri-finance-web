import { useEffect, useState } from 'react'
import { LockKeyhole, ShieldCheck } from 'lucide-react'
import { toast } from 'react-toastify'
import { getConsent, updateConsent } from '../services/consentService'

function ConsentPage() {
  const [consent, setConsent] = useState({
    shareTransactions: true,
    shareSatelliteData: true,
  })

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getConsent()
        setConsent(data)
      } catch {
        toast.error('Unable to load consent settings.')
      }
    }
    load()
  }, [])

  const handleToggle = async (key) => {
    const nextValue = !consent[key]
    setConsent((prev) => ({ ...prev, [key]: nextValue }))
    try {
      await updateConsent({ [key]: nextValue })
      toast.success(`${key === 'shareTransactions' ? 'Transactions' : 'Satellite data'} sharing ${nextValue ? 'enabled' : 'disabled'}.`)
    } catch {
      setConsent((prev) => ({ ...prev, [key]: !nextValue }))
      toast.error('Failed to update consent preference.')
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Consent Controls</h1>
        <p className="mt-1 text-slate-600">Manage data permissions and trust settings.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <LockKeyhole className="h-5 w-5 text-blue-700" />
            <h3 className="text-lg font-semibold text-slate-900">Data Sharing Preferences</h3>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
              <span className="font-medium text-slate-700">Share Transactions</span>
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={consent.shareTransactions}
                onChange={() => handleToggle('shareTransactions')}
              />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
              <span className="font-medium text-slate-700">Share Satellite Data</span>
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={consent.shareSatelliteData}
                onChange={() => handleToggle('shareSatelliteData')}
              />
            </label>
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-700" />
            <h3 className="text-lg font-semibold text-slate-900">Trust & Security Status</h3>
          </div>
          <div className="space-y-2 text-sm text-slate-700">
            <p className="rounded-lg bg-slate-50 px-3 py-2">JWT attached on secure requests: <strong>Enabled</strong></p>
            <p className="rounded-lg bg-slate-50 px-3 py-2">Auto logout on session expiry: <strong>Enabled</strong></p>
            <p className="rounded-lg bg-slate-50 px-3 py-2">Consent updates audit trail: <strong>Active</strong></p>
          </div>
        </article>
      </div>
    </section>
  )
}

export default ConsentPage
