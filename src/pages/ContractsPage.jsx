import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import DataTableShell from '../components/ui/DataTableShell'
import { listContracts, listContractConsents, listLoanMessages, postLoanMessage, startBuyerConsent } from '../services/bankabilityService'

/**
 * Contracts / receivables overview for bank + admin.
 * Comment: buyer mini-portal bridge (OTP start) + loan clarification from web.
 */
function ContractsPage() {
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loanId, setLoanId] = useState('')
  const [messages, setMessages] = useState([])
  const [reply, setReply] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const data = await listContracts()
      setContracts(Array.isArray(data) ? data : [])
    } catch (e) {
      toast.error('Failed to load contracts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const onStartOtp = async (id) => {
    try {
      const res = await startBuyerConsent(id)
      const link = res.verificationLink || `/buyer-verify?contractId=${id}`
      toast.info(
        res.otpCode
          ? `OTP ${res.otpCode} · link ${link}`
          : `Verification sent · ${link}`,
      )
    } catch (e) {
      toast.error(e?.response?.data?.error || 'OTP failed')
    }
  }

  const onViewConsent = async (id) => {
    try {
      const list = await listContractConsents(id)
      const consent = Array.isArray(list) ? list[0] : null
      if (!consent) {
        toast.info('No consent recorded yet')
        return
      }
      const doc = consent.consentDocumentUrl
      const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/api\/?$/, '')
      if (doc) {
        window.open(doc.startsWith('http') ? doc : `${base}${doc}`, '_blank')
      } else {
        toast.info(
          `Consent ${consent.otpVerified ? 'verified' : 'pending'} · ${consent.verifiedAt || 'no timestamp'}`,
        )
      }
    } catch {
      toast.error('Could not load consent')
    }
  }

  const loadMessages = async () => {
    if (!loanId) return
    try {
      const data = await listLoanMessages(Number(loanId))
      setMessages(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Could not load messages')
    }
  }

  const sendReply = async () => {
    if (!loanId || !reply.trim()) return
    try {
      await postLoanMessage({
        loanId: Number(loanId),
        senderRole: 'BANK',
        body: reply.trim(),
      })
      setReply('')
      loadMessages()
      toast.success('Message sent')
    } catch {
      toast.error('Send failed')
    }
  }

  return (
    <section className="dashboard-page">
      <PageHeader
        breadcrumb="Bankability › Receivables"
        title="Purchase contracts"
        subtitle="Farmer receivables used as collateral — track verification and request clarifications on loans."
        actions={
          <button type="button" className="btn-primary" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />

      <div className="widgets four">
        <StatCard title="All contracts" value={String(contracts.length)} />
        <StatCard title="Verified" value={String(contracts.filter((c) => c.status === 'verified').length)} />
        <StatCard
          title="Field inspection"
          value={String(contracts.filter((c) => c.status === 'field_inspection_pending').length)}
        />
        <StatCard title="Pending buyer" value={String(contracts.filter((c) => c.status === 'buyer_verification_pending').length)} />
      </div>

      <div className="mt-6 space-y-6">
        <DataTableShell title="Contracts">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Farmer</th>
                <th>Buyer</th>
                <th>Value</th>
                <th>Status</th>
                <th>Document</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.contractId}>
                  <td>#{c.contractId}</td>
                  <td>#{c.farmerId}</td>
                  <td>{c.buyerName}</td>
                  <td>{c.contractValue}</td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                  <td>
                    {c.documentUrl ? (
                      <a href={c.documentUrl.startsWith('http') ? c.documentUrl : `${(import.meta.env.VITE_API_BASE_URL || '').replace(/\/api\/?$/, '')}${c.documentUrl}`} target="_blank" rel="noreferrer">
                        View
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn-secondary" onClick={() => onStartOtp(c.contractId)}>
                        Start buyer OTP
                      </button>
                      <button type="button" className="btn-secondary" onClick={() => onViewConsent(c.contractId)}>
                        Consent doc
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <h3 className="mb-3 font-semibold">Loan clarification thread</h3>
          <div className="mb-3 flex flex-wrap gap-2">
            <input
              className="rounded-lg border border-[var(--border)] bg-transparent p-2"
              placeholder="Loan ID"
              value={loanId}
              onChange={(e) => setLoanId(e.target.value)}
            />
            <button type="button" className="btn-secondary" onClick={loadMessages}>
              Load messages
            </button>
          </div>
          <ul className="mb-3 max-h-48 space-y-2 overflow-auto text-sm">
            {messages.map((m) => (
              <li key={m.messageId} className="rounded-lg bg-[var(--surface-muted,#f3f4f6)] p-2">
                <strong>{m.senderRole}:</strong> {m.body}
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-lg border border-[var(--border)] bg-transparent p-2"
              placeholder="Ask farmer for clarification…"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
            />
            <button type="button" className="btn-primary" onClick={sendReply}>
              Send
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ContractsPage
