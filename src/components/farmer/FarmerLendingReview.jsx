import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  CreditCard,
  Fingerprint,
  Info,
  ShieldAlert,
  XCircle,
} from 'lucide-react'
import StatusBadge from '../ui/StatusBadge'
import { formatRwf } from '../../utils/currency'

function normalizeRisk(risk) {
  const value = String(risk || '').trim().toUpperCase()
  if (value === 'HIGH' || value === 'MEDIUM' || value === 'LOW') return value
  if (value === 'CRITICAL') return 'HIGH'
  return null
}

function formatRiskLabel(risk) {
  const value = normalizeRisk(risk)
  if (!value) return null
  return value.charAt(0) + value.slice(1).toLowerCase()
}

function formatDate(value) {
  if (!value) return '—'
  return String(value).replace('T', ' ').slice(0, 16)
}

function formatDateShort(value) {
  if (!value) return '—'
  return String(value).slice(0, 10)
}

function formatConfidence(value) {
  if (value == null || value === '') return null
  const n = Number(value)
  if (Number.isNaN(n)) return null
  if (n <= 1) return `${Math.round(n * 100)}%`
  return `${Math.round(n)}%`
}

function severityClass(severity) {
  const value = String(severity || '').toUpperCase()
  if (value === 'HIGH' || value === 'CRITICAL') return 'lending-flag--high'
  if (value === 'MEDIUM' || value === 'WARN' || value === 'WARNING') return 'lending-flag--mid'
  return 'lending-flag--low'
}

function checkItem({ ok, label, detail }) {
  return { ok, label, detail }
}

function FarmerLendingReview({
  farmer,
  consentStatus,
  creditInsight,
  fraudAssessment,
  repayments,
  repaymentHealth,
  loading,
}) {
  const hasPhoto = Boolean(
    farmer?.profilePhotoUrl ||
      farmer?.profilePhoto ||
      farmer?.photoUrl ||
      farmer?.imageUrl ||
      farmer?.avatarUrl ||
      farmer?.photo,
  )

  const kycChecks = [
    checkItem({
      ok: Boolean(farmer?.nationalId),
      label: 'National ID',
      detail: farmer?.nationalId || 'Missing',
    }),
    checkItem({
      ok: Boolean(farmer?.phone),
      label: 'Phone',
      detail: farmer?.phone ? 'On file' : 'Missing',
    }),
    checkItem({
      ok: Boolean(farmer?.email),
      label: 'Email',
      detail: farmer?.email ? 'On file' : 'Missing',
    }),
    checkItem({
      ok: hasPhoto,
      label: 'Profile photo',
      detail: hasPhoto ? 'Uploaded' : 'None',
    }),
    checkItem({
      ok: consentStatus?.bank === true,
      label: 'Bank consent',
      detail:
        consentStatus?.bank === true
          ? 'Granted'
          : consentStatus?.bank === false
            ? 'Not granted'
            : 'Unknown',
    }),
  ]

  const kycPassCount = kycChecks.filter((item) => item.ok).length
  const fraudRisk = normalizeRisk(fraudAssessment?.riskLevel)
  const fraudRiskLabel = formatRiskLabel(fraudAssessment?.riskLevel)
  const flags = Array.isArray(fraudAssessment?.flags) ? fraudAssessment.flags : []
  const factors = Array.isArray(creditInsight?.factors) ? creditInsight.factors : []
  const confidence = formatConfidence(creditInsight?.confidenceLevel)
  const insightScore =
    creditInsight?.score != null && creditInsight.score !== ''
      ? Number(creditInsight.score)
      : null
  const insightRisk = formatRiskLabel(creditInsight?.riskLevel)

  const repaymentRows = Array.isArray(repayments) ? repayments : []
  const schedule = Array.isArray(repaymentHealth?.schedule) ? repaymentHealth.schedule : []
  const overdueOnSchedule = schedule.filter((row) =>
    String(row.status || '').toUpperCase().includes('OVERDUE'),
  ).length

  return (
    <section className="lending-review" aria-labelledby="lending-review-title">
      <header className="lending-review__header">
        <div>
          <p className="lending-review__eyebrow">Underwriting</p>
          <h2 id="lending-review-title" className="lending-review__title">
            Lending review
          </h2>
          <p className="lending-review__subtitle">
            KYC completeness, fraud signals, score drivers, and repayment history for this farmer.
          </p>
        </div>
        {loading ? <span className="lending-review__loading">Refreshing…</span> : null}
      </header>

      <div className="lending-review__grid">
        <article className="lending-panel">
          <div className="lending-panel__head">
            <div className="lending-panel__icon lending-panel__icon--kyc" aria-hidden>
              <Fingerprint size={18} />
            </div>
            <div>
              <h3 className="lending-panel__title">KYC & fraud</h3>
              <p className="lending-panel__meta">
                {kycPassCount}/{kycChecks.length} identity checks ·{' '}
                {fraudAssessment
                  ? `${fraudRiskLabel || 'Unknown'} fraud risk`
                  : 'Fraud check unavailable'}
              </p>
            </div>
            {fraudRiskLabel ? <StatusBadge value={fraudRisk || fraudAssessment?.riskLevel} /> : null}
          </div>

          <ul className="lending-kyc-list">
            {kycChecks.map((item) => (
              <li key={item.label} className={item.ok ? 'is-ok' : 'is-missing'}>
                {item.ok ? (
                  <CheckCircle2 size={15} aria-hidden />
                ) : (
                  <XCircle size={15} aria-hidden />
                )}
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </span>
              </li>
            ))}
          </ul>

          <div className="lending-fraud">
            <div className="lending-fraud__summary">
              <span>Fraud score</span>
              <strong>
                {fraudAssessment?.riskScore != null ? fraudAssessment.riskScore : '—'}
              </strong>
            </div>
            {flags.length === 0 ? (
              <p className="lending-empty">
                {fraudAssessment
                  ? 'No fraud flags raised for this profile.'
                  : 'Fraud assessment could not be loaded.'}
              </p>
            ) : (
              <ul className="lending-flag-list">
                {flags.map((flag, index) => (
                  <li
                    key={`${flag.code || 'flag'}-${index}`}
                    className={`lending-flag ${severityClass(flag.severity)}`}
                  >
                    <ShieldAlert size={14} aria-hidden />
                    <div>
                      <strong>{flag.code || 'Alert'}</strong>
                      <span>{flag.message || 'Review recommended.'}</span>
                    </div>
                    {flag.severity ? (
                      <em>{String(flag.severity).toLowerCase()}</em>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </article>

        <article className="lending-panel">
          <div className="lending-panel__head">
            <div className="lending-panel__icon lending-panel__icon--score" aria-hidden>
              <Info size={18} />
            </div>
            <div>
              <h3 className="lending-panel__title">Score explanation</h3>
              <p className="lending-panel__meta">
                {insightScore != null
                  ? `Score ${insightScore}${insightRisk ? ` · ${insightRisk} risk` : ''}`
                  : 'Drivers behind the credit score'}
                {confidence ? ` · ${confidence} confidence` : ''}
              </p>
            </div>
          </div>

          {creditInsight?.summary ? (
            <p className="lending-insight-summary">{creditInsight.summary}</p>
          ) : (
            <p className="lending-empty">
              {creditInsight
                ? 'No narrative summary was returned for this score.'
                : 'Credit insight could not be loaded.'}
            </p>
          )}

          {factors.length > 0 ? (
            <ul className="lending-factor-list">
              {factors.map((factor, index) => (
                <li key={`factor-${index}`}>
                  <CircleAlert size={14} aria-hidden />
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {creditInsight?.usedLlm || creditInsight?.model ? (
            <p className="lending-panel__footnote">
              {creditInsight.usedLlm ? 'AI-assisted insight' : 'Rule-based insight'}
              {creditInsight.model ? ` · ${creditInsight.model}` : ''}
            </p>
          ) : null}
        </article>

        <article className="lending-panel lending-panel--wide">
          <div className="lending-panel__head">
            <div className="lending-panel__icon lending-panel__icon--repay" aria-hidden>
              <CreditCard size={18} />
            </div>
            <div>
              <h3 className="lending-panel__title">Repayment history</h3>
              <p className="lending-panel__meta">
                {repaymentHealth?.loanId
                  ? `Health for loan #${repaymentHealth.loanId}`
                  : 'Payments recorded across linked loans'}
              </p>
            </div>
            {repaymentHealth?.overdueInstallments > 0 || overdueOnSchedule > 0 ? (
              <span className="lending-pill lending-pill--warn">
                <AlertTriangle size={13} aria-hidden />
                {repaymentHealth?.overdueInstallments || overdueOnSchedule} overdue
              </span>
            ) : null}
          </div>

          {repaymentHealth ? (
            <div className="lending-repay-stats">
              <div>
                <span>Principal</span>
                <strong>{formatRwf(repaymentHealth.principal)}</strong>
              </div>
              <div>
                <span>Total paid</span>
                <strong>{formatRwf(repaymentHealth.totalPaid)}</strong>
              </div>
              <div>
                <span>Remaining</span>
                <strong>{formatRwf(repaymentHealth.remainingPrincipal)}</strong>
              </div>
              <div>
                <span>Monthly</span>
                <strong>{formatRwf(repaymentHealth.monthlyPayment)}</strong>
              </div>
            </div>
          ) : null}

          <div className="lending-repay-tables">
            <div className="lending-repay-block">
              <h4>Payments received</h4>
              {repaymentRows.length === 0 ? (
                <p className="lending-empty">No repayments recorded yet.</p>
              ) : (
                <div className="lending-table-wrap">
                  <table className="lending-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Loan</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {repaymentRows.slice(0, 8).map((row) => (
                        <tr key={row.repaymentId || `${row.loanId}-${row.paymentDate}`}>
                          <td>{formatDate(row.paymentDate)}</td>
                          <td>#{row.loanId}</td>
                          <td>{formatRwf(row.amountPaid)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="lending-repay-block">
              <h4>Installment schedule</h4>
              {schedule.length === 0 ? (
                <p className="lending-empty">
                  {repaymentHealth
                    ? 'No installment schedule available for the selected loan.'
                    : 'Select a disbursed loan to see repayment health.'}
                </p>
              ) : (
                <div className="lending-table-wrap">
                  <table className="lending-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Due</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedule.slice(0, 8).map((row) => (
                        <tr key={`inst-${row.period}-${row.dueDate}`}>
                          <td>{row.period}</td>
                          <td>{formatDateShort(row.dueDate)}</td>
                          <td>{formatRwf(row.amountDue)}</td>
                          <td>
                            <StatusBadge value={String(row.status || '—')} />
                            {row.daysOverdue > 0 ? (
                              <small className="lending-overdue-days">
                                {row.daysOverdue}d overdue
                              </small>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </article>
      </div>
    </section>
  )
}

export default FarmerLendingReview
