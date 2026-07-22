import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import DataTableShell from '../components/ui/DataTableShell'
import {
  listContracts,
  listContractConsents,
  listLoanMessages,
  postLoanMessage,
  startBuyerConsent,
  uploadLoanMessageAttachment,
} from '../services/bankabilityService'

/** Stages where buyer OTP is still the next staff/farmer action. */
function needsBuyerOtp(status) {
  const s = String(status || '').toLowerCase()
  return (
    !s ||
    s === 'draft' ||
    s === 'submitted' ||
    s === 'buyer_verification_pending' ||
    (s.includes('buyer') && !s.includes('field'))
  )
}

function stageHint(status) {
  const s = String(status || '').toLowerCase()
  if (s.includes('buyer') || s === 'draft' || s === 'submitted') {
    return 'Next: send buyer OTP link'
  }
  if (s.includes('field_inspection')) {
    return 'Next: inspector field visit'
  }
  if (s === 'verified') {
    return 'Ready as loan collateral'
  }
  if (s.includes('disput')) {
    return 'Buyer or inspector disputed'
  }
  return 'In progress'
}

/**
 * Contracts / receivables overview for bank + admin.
 * Stage-aware actions: OTP only while waiting for buyer; then inspections.
 */
function ContractsPage() {
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loanId, setLoanId] = useState('')
  const [messages, setMessages] = useState([])
  const [reply, setReply] = useState('')
  const [messageType, setMessageType] = useState('CLARIFICATION')
  const [attachFile, setAttachFile] = useState(null)

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
      const absolute = link.startsWith('http')
        ? link
        : `${window.location.origin}${link.startsWith('/') ? link : `/${link}`}`
      try {
        await navigator.clipboard.writeText(absolute)
      } catch {
        /* clipboard optional */
      }
      toast.success(
        res.otpCode
          ? `Buyer link copied. OTP ${res.otpCode} (use if email/SMS not sent).`
          : 'Buyer verification link copied — send it to the buyer.',
      )
      toast.info(absolute, { autoClose: 12000 })
      load()
    } catch (e) {
      toast.error(e?.response?.data?.error || 'OTP failed')
    }
  }

  const onViewConsent = async (id) => {
    try {
      const list = await listContractConsents(id)
      const consent = Array.isArray(list) ? list[0] : null
      if (!consent) {
        toast.info('No consent recorded yet — start buyer OTP first')
        return
      }
      const doc = consent.consentDocumentUrl
      const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/api\/?$/, '')
      if (doc) {
        window.open(doc.startsWith('http') ? doc : `${base}${doc}`, '_blank')
      } else if (consent.otpVerified) {
        toast.info('OTP verified — PDF may still be generating. Check Consent Vault.')
      } else {
        toast.info('Consent pending — buyer has not completed OTP yet')
      }
    } catch {
      toast.error('Could not load consent')
    }
  }

  const openBuyerPage = (id) => {
    window.open(`/buyer-verify?contractId=${id}`, '_blank')
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
      const saved = await postLoanMessage({
        loanId: Number(loanId),
        senderRole: 'BANK',
        messageType,
        body: reply.trim(),
        requiresResponse: messageType === 'DOCUMENT_REQUEST' || messageType === 'CLARIFICATION',
      })
      if (attachFile && saved?.messageId) {
        await uploadLoanMessageAttachment(saved.messageId, attachFile)
      }
      setReply('')
      setAttachFile(null)
      loadMessages()
      toast.success(
        messageType === 'DOCUMENT_REQUEST'
          ? 'Document request sent to farmer'
          : 'Clarification sent to farmer',
      )
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

      <div
        className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm"
        style={{ color: 'var(--text-secondary)' }}
      >
        <strong style={{ color: 'var(--text-primary)' }}>How this works (no confusion)</strong>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            <strong>Buyer OTP</strong> — send the buyer a link. They confirm on the public page. Only
            while status waits for buyer.
          </li>
          <li>
            <strong>Field inspection</strong> — after OTP, inspector works on{' '}
            <Link to="/inspections" className="underline">
              Inspections
            </Link>
            . Do not restart OTP for that.
          </li>
          <li>
            <strong>Consent PDF</strong> — proof for banks after OTP (Consent Vault). Not a second
            approve button.
          </li>
        </ol>
      </div>

      <div className="widgets four">
        <StatCard title="All contracts" value={String(contracts.length)} />
        <StatCard title="Verified" value={String(contracts.filter((c) => c.status === 'verified').length)} />
        <StatCard
          title="Field inspection"
          value={String(contracts.filter((c) => c.status === 'field_inspection_pending').length)}
        />
        <StatCard
          title="Pending buyer"
          value={String(contracts.filter((c) => c.status === 'buyer_verification_pending').length)}
        />
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
                <th>Next step</th>
                <th>Document</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => {
                const otpNeeded = needsBuyerOtp(c.status)
                const inspection = String(c.status || '').toLowerCase().includes('field_inspection')
                return (
                  <tr key={c.contractId}>
                    <td>#{c.contractId}</td>
                    <td>#{c.farmerId}</td>
                    <td>{c.buyerName}</td>
                    <td>{c.contractValue}</td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{stageHint(c.status)}</td>
                    <td>
                      {c.documentUrl ? (
                        <a
                          href={
                            c.documentUrl.startsWith('http')
                              ? c.documentUrl
                              : `${(import.meta.env.VITE_API_BASE_URL || '').replace(/\/api\/?$/, '')}${c.documentUrl}`
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          View
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        {otpNeeded ? (
                          <>
                            <button
                              type="button"
                              className="btn-primary"
                              onClick={() => onStartOtp(c.contractId)}
                            >
                              Send buyer OTP link
                            </button>
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => openBuyerPage(c.contractId)}
                            >
                              Open buyer page
                            </button>
                          </>
                        ) : null}
                        {inspection ? (
                          <Link to="/inspections" className="btn-primary">
                            Go to inspections
                          </Link>
                        ) : null}
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => onViewConsent(c.contractId)}
                        >
                          Consent PDF
                        </button>
                        {!otpNeeded ? (
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => onStartOtp(c.contractId)}
                            title="Only if buyer never received the first link"
                          >
                            Resend OTP
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </DataTableShell>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <h3 className="mb-3 font-semibold">Loan clarification thread</h3>
          <p className="mb-3 text-sm" style={{ color: 'var(--text-muted)' }}>
            Separate from buyer OTP — bank asks the farmer for loan documents or clarifications.
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            <input
              className="rounded-lg border border-[var(--border)] bg-transparent p-2"
              placeholder="Loan ID"
              value={loanId}
              onChange={(e) => setLoanId(e.target.value)}
            />
            <select
              className="rounded-lg border border-[var(--border)] bg-transparent p-2"
              value={messageType}
              onChange={(e) => setMessageType(e.target.value)}
            >
              <option value="CLARIFICATION">Ask clarification</option>
              <option value="DOCUMENT_REQUEST">Request documents</option>
              <option value="INFO">Info note</option>
            </select>
            <button type="button" className="btn-secondary" onClick={loadMessages}>
              Load messages
            </button>
          </div>
          <ul className="mb-3 max-h-48 space-y-2 overflow-auto text-sm">
            {messages.map((m) => (
              <li key={m.messageId} className="rounded-lg bg-[var(--surface-muted,#f3f4f6)] p-2">
                <strong>{m.senderRole}</strong>
                {m.messageType ? ` · ${m.messageType}` : ''}
                {m.requiresResponse && !m.respondedAt ? ' · awaiting farmer' : ''}
                {m.respondedAt ? ' · answered' : ''}
                : {m.body}
                {m.attachmentUrl ? (
                  <div>
                    <a
                      href={
                        m.attachmentUrl.startsWith('http')
                          ? m.attachmentUrl
                          : `${(import.meta.env.VITE_API_BASE_URL || '').replace(/\/api\/?$/, '')}${m.attachmentUrl}`
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      Attachment
                    </a>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2">
            <input
              className="w-full rounded-lg border border-[var(--border)] bg-transparent p-2"
              placeholder="Ask farmer for clarification or missing documents…"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
            />
            <div className="flex flex-wrap gap-2 items-center">
              <input type="file" onChange={(e) => setAttachFile(e.target.files?.[0] || null)} />
              <button type="button" className="btn-primary" onClick={sendReply}>
                Send to farmer
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ContractsPage
