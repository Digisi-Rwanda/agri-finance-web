import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  CloudRain,
  CreditCard,
  FileCheck2,
  Fingerprint,
  Gauge,
  Info,
  NotebookPen,
  ShieldAlert,
  Trash2,
  XCircle,
} from 'lucide-react'
import StatusBadge from '../ui/StatusBadge'
import { formatRwf } from '../../utils/currency'
import {
  estimateLoanAffordability,
  getSeasonalOutlook,
  summarizeInstallments,
} from '../../utils/loanAffordability'
import {
  addDecisionNote,
  deleteDecisionNote,
  getDecisionNotes,
} from '../../utils/decisionNotes'

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

function checkItem({ ok, label, detail, required = false }) {
  return { ok, label, detail, required }
}

function installmentStatusLabel(status) {
  const value = String(status || '').toUpperCase()
  if (value.includes('OVERDUE')) return 'Overdue'
  if (value.includes('LATE')) return 'Late'
  if (value.includes('PAID') || value.includes('SETTLED') || value.includes('ON_TIME')) return 'Paid'
  if (value.includes('DUE') || value.includes('PENDING') || value.includes('UPCOMING')) return 'Upcoming'
  return status || '—'
}

function FarmerLendingReview({
  farmer,
  farms = [],
  yieldRecords = [],
  loans = [],
  consentStatus,
  creditScore,
  creditRiskLevel,
  creditInsight,
  enhancedRisk,
  fraudAssessment,
  repayments,
  repaymentHealth,
  weatherRisk,
  activityCount = 0,
  totalAcreage = 0,
  officerName,
  loading,
  defaultOpen = false,
}) {
  const farmerId = farmer?.farmerId
  const [notes, setNotes] = useState(() => (farmerId ? getDecisionNotes(farmerId) : []))
  const [noteDraft, setNoteDraft] = useState('')
  const [open, setOpen] = useState(Boolean(defaultOpen))

  useEffect(() => {
    setNotes(farmerId ? getDecisionNotes(farmerId) : [])
    setNoteDraft('')
  }, [farmerId])

  useEffect(() => {
    setOpen(Boolean(defaultOpen))
  }, [defaultOpen, farmerId])

  const hasPhoto = Boolean(
    farmer?.profilePhotoUrl ||
      farmer?.profilePhoto ||
      farmer?.photoUrl ||
      farmer?.imageUrl ||
      farmer?.avatarUrl ||
      farmer?.photo,
  )

  const farmWithProof = farms.find((farm) => farm?.imageUrl || farm?.farmUpi || farm?.acreage)
  const farmWithCoords = farms.find((farm) => farm?.latitude != null && farm?.longitude != null)
  const primaryCrop = farms.find((farm) => farm?.cropType)?.cropType || yieldRecords[0]?.cropType

  const pendingLoan = loans.find((loan) => String(loan.status || '').toUpperCase() === 'PENDING')
  const pendingCount = loans.filter((loan) => String(loan.status || '').toUpperCase() === 'PENDING')
    .length

  const documentChecks = [
    checkItem({
      ok: Boolean(farmer?.nationalId),
      label: 'National ID',
      detail: farmer?.nationalId || 'Missing — verify before approval',
      required: true,
    }),
    checkItem({
      ok: hasPhoto,
      label: 'Profile photo',
      detail: hasPhoto ? 'Available' : 'Missing',
      required: true,
    }),
    checkItem({
      ok: Boolean(farmWithProof?.imageUrl || farmWithProof?.farmUpi),
      label: 'Farm proof',
      detail: farmWithProof?.farmUpi
        ? `UPI ${farmWithProof.farmUpi}`
        : farmWithProof?.imageUrl
          ? 'Farm image on file'
          : 'No UPI or farm image',
      required: true,
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
      required: true,
    }),
    checkItem({
      ok: consentStatus?.transactions === true,
      label: 'Transactions consent',
      detail:
        consentStatus?.transactions === true
          ? 'Granted'
          : consentStatus?.transactions === false
            ? 'Not granted'
            : 'Unknown',
    }),
    checkItem({
      ok: consentStatus?.satellite === true,
      label: 'Satellite consent',
      detail:
        consentStatus?.satellite === true
          ? 'Granted'
          : consentStatus?.satellite === false
            ? 'Not granted'
            : 'Unknown',
    }),
    checkItem({
      ok: farms.length > 0,
      label: 'Farm register',
      detail: farms.length ? `${farms.length} farm${farms.length === 1 ? '' : 's'}` : 'No farms',
    }),
  ]

  const docsPass = documentChecks.filter((item) => item.ok).length
  const requiredMissing = documentChecks.filter((item) => item.required && !item.ok)

  const affordability = useMemo(
    () =>
      estimateLoanAffordability({
        creditScore,
        riskLevel: creditRiskLevel || creditInsight?.riskLevel || enhancedRisk?.compositeRiskLevel,
        totalAcreage,
        activityCount,
        outstandingBalance: Number(repaymentHealth?.remainingPrincipal || 0),
        pendingLoanAmount: Number(pendingLoan?.amount || 0),
      }),
    [
      creditScore,
      creditRiskLevel,
      creditInsight?.riskLevel,
      enhancedRisk?.compositeRiskLevel,
      totalAcreage,
      activityCount,
      repaymentHealth?.remainingPrincipal,
      pendingLoan?.amount,
    ],
  )

  const fraudRisk = normalizeRisk(fraudAssessment?.riskLevel)
  const fraudRiskLabel = formatRiskLabel(fraudAssessment?.riskLevel)
  const flags = Array.isArray(fraudAssessment?.flags) ? fraudAssessment.flags : []
  const insightFactors = Array.isArray(creditInsight?.factors) ? creditInsight.factors : []
  const riskFactors = Array.isArray(enhancedRisk?.factors) ? enhancedRisk.factors : []
  const confidence = formatConfidence(
    creditInsight?.confidenceLevel ?? enhancedRisk?.ruleBasedScore,
  )
  const insightScore =
    creditInsight?.score != null && creditInsight.score !== ''
      ? Number(creditInsight.score)
      : creditScore != null
        ? Number(creditScore)
        : enhancedRisk?.compositeScore != null
          ? Number(enhancedRisk.compositeScore)
          : null
  const insightRisk = formatRiskLabel(
    creditInsight?.riskLevel || creditRiskLevel || enhancedRisk?.compositeRiskLevel,
  )

  const repaymentRows = Array.isArray(repayments) ? repayments : []
  const schedule = Array.isArray(repaymentHealth?.schedule) ? repaymentHealth.schedule : []
  const installmentCounts = summarizeInstallments(schedule)
  const seasonal = getSeasonalOutlook(primaryCrop)
  const weatherAlerts = Array.isArray(weatherRisk?.alerts) ? weatherRisk.alerts : []

  const handleAddNote = (event) => {
    event.preventDefault()
    if (!farmerId || !noteDraft.trim()) return
    const next = addDecisionNote(farmerId, {
      text: noteDraft,
      author: officerName || 'Bank officer',
    })
    setNotes(next)
    setNoteDraft('')
  }

  const handleDeleteNote = (noteId) => {
    if (!farmerId) return
    setNotes(deleteDecisionNote(farmerId, noteId))
  }

  return (
    <section
      className={`lending-review${open ? ' is-open' : ' is-collapsed'}`}
      aria-labelledby="lending-review-title"
    >
      <header className="lending-review__header">
        <div>
          <p className="lending-review__eyebrow">Section 2 · Underwriting</p>
          <h2 id="lending-review-title" className="lending-review__title">
            Lending review
          </h2>
          <p className="lending-review__subtitle">
            KYC checklist, affordability, score drivers, fraud flags, and officer notes.
          </p>
        </div>
        <div className="lending-review__header-actions">
          {loading ? <span className="lending-review__loading">Refreshing…</span> : null}
          <button
            type="button"
            className="btn-secondary"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? 'Hide pack' : 'Open pack'}
          </button>
        </div>
      </header>

      {!open ? (
        <div className="lending-review__summary-strip">
          <span>
            Score <strong>{creditScore ?? '—'}</strong>
          </span>
          <span>
            Limit{' '}
            <strong>
              {affordability.availableLimit != null
                ? formatRwf(affordability.availableLimit)
                : '—'}
            </strong>
          </span>
          <span>
            KYC{' '}
            <strong>
              {requiredMissing.length === 0
                ? 'Complete'
                : `${requiredMissing.length} missing`}
            </strong>
          </span>
          {flags.length > 0 ? (
            <span>
              Flags <strong>{flags.length}</strong>
            </span>
          ) : null}
        </div>
      ) : null}

      {open && requiredMissing.length > 0 ? (
        <div className="lending-banner lending-banner--warn">
          <AlertTriangle size={16} aria-hidden />
          <span>
            <strong>KYC incomplete</strong> — missing{' '}
            {requiredMissing.map((item) => item.label).join(', ')}. Verify before approving credit.
          </span>
        </div>
      ) : null}

      {open ? (
      <div className="lending-review__grid">
        {/* 1. Documents / KYC */}
        <article className="lending-panel">
          <div className="lending-panel__head">
            <div className="lending-panel__icon lending-panel__icon--docs" aria-hidden>
              <FileCheck2 size={18} />
            </div>
            <div>
              <h3 className="lending-panel__title">Document checklist</h3>
              <p className="lending-panel__meta">
                {docsPass}/{documentChecks.length} complete · National ID & farm proof first
              </p>
            </div>
          </div>

          <ul className="lending-kyc-list">
            {documentChecks.map((item) => (
              <li key={item.label} className={item.ok ? 'is-ok' : 'is-missing'}>
                {item.ok ? <CheckCircle2 size={15} aria-hidden /> : <XCircle size={15} aria-hidden />}
                <span>
                  <strong>
                    {item.label}
                    {item.required ? ' *' : ''}
                  </strong>
                  <small>{item.detail}</small>
                </span>
              </li>
            ))}
          </ul>
          <p className="lending-panel__footnote">
            Guarantor / co-signer is not collected in the current loan model.
          </p>
        </article>

        {/* 2. Fraud */}
        <article className="lending-panel">
          <div className="lending-panel__head">
            <div className="lending-panel__icon lending-panel__icon--kyc" aria-hidden>
              <Fingerprint size={18} />
            </div>
            <div>
              <h3 className="lending-panel__title">Fraud & anomaly flags</h3>
              <p className="lending-panel__meta">
                {fraudAssessment
                  ? `${fraudRiskLabel || 'Unknown'} risk · score ${fraudAssessment.riskScore ?? '—'}`
                  : 'Fraud check unavailable'}
                {pendingCount > 1 ? ` · ${pendingCount} pending loans` : ''}
              </p>
            </div>
            {fraudRiskLabel ? <StatusBadge value={fraudRisk || fraudAssessment?.riskLevel} /> : null}
          </div>

          {pendingCount > 1 ? (
            <div className={`lending-flag lending-flag--mid`}>
              <ShieldAlert size={14} aria-hidden />
              <div>
                <strong>MULTIPLE_PENDING</strong>
                <span>{pendingCount} pending loan applications — review exposure before approval.</span>
              </div>
              <em>medium</em>
            </div>
          ) : null}

          {flags.length === 0 && pendingCount <= 1 ? (
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
                  {flag.severity ? <em>{String(flag.severity).toLowerCase()}</em> : null}
                </li>
              ))}
            </ul>
          )}

          {fraudAssessment?.mlAnomalyScore != null ? (
            <p className="lending-panel__footnote">
              ML anomaly {Number(fraudAssessment.mlAnomalyScore).toFixed(2)}
              {fraudAssessment.mlModel ? ` · ${fraudAssessment.mlModel}` : ''}
            </p>
          ) : null}
        </article>

        {/* 3. Affordability */}
        <article className="lending-panel">
          <div className="lending-panel__head">
            <div className="lending-panel__icon lending-panel__icon--limit" aria-hidden>
              <Gauge size={18} />
            </div>
            <div>
              <h3 className="lending-panel__title">Recommended limit</h3>
              <p className="lending-panel__meta">
                Score + farm size + activity · {affordability.posture} posture
              </p>
            </div>
          </div>

          <div className="lending-limit-hero">
            <span>Available to consider</span>
            <strong>
              {affordability.availableLimit != null
                ? formatRwf(affordability.availableLimit)
                : '—'}
            </strong>
            <small>
              Capacity {affordability.recommendedLimit != null
                ? formatRwf(affordability.recommendedLimit)
                : '—'}
            </small>
          </div>

          <ul className="lending-factor-list lending-factor-list--compact">
            {affordability.reasons.map((reason) => (
              <li key={reason}>
                <Info size={14} aria-hidden />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
          <p className="lending-panel__footnote">
            Advisory estimate for officers — not an automatic approval.
          </p>
        </article>

        {/* 4. Score explanation */}
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
                  : 'Top drivers behind the credit score'}
                {confidence ? ` · ${confidence} conf.` : ''}
              </p>
            </div>
          </div>

          {enhancedRisk?.compositeScore != null ? (
            <div className="lending-repay-stats lending-repay-stats--tight">
              <div>
                <span>Composite</span>
                <strong>{Number(enhancedRisk.compositeScore)}</strong>
              </div>
              <div>
                <span>Default %</span>
                <strong>
                  {enhancedRisk.defaultProbabilityPercent != null
                    ? `${Number(enhancedRisk.defaultProbabilityPercent).toFixed(1)}%`
                    : '—'}
                </strong>
              </div>
            </div>
          ) : null}

          {creditInsight?.summary ? (
            <p className="lending-insight-summary">{creditInsight.summary}</p>
          ) : (
            <p className="lending-empty">
              {creditInsight
                ? 'No narrative summary was returned for this score.'
                : 'Credit insight could not be loaded.'}
            </p>
          )}

          {insightFactors.length > 0 ? (
            <>
              <h4 className="lending-panel__subhead">Top factors</h4>
              <ul className="lending-factor-list">
                {insightFactors.slice(0, 6).map((factor, index) => (
                  <li key={`factor-${index}`}>
                    <CircleAlert size={14} aria-hidden />
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {riskFactors.length > 0 ? (
            <>
              <h4 className="lending-panel__subhead">Risk blend</h4>
              <ul className="lending-factor-list lending-factor-list--compact">
                {riskFactors.map((factor) => (
                  <li key={factor.code || factor.label}>
                    <CircleAlert size={14} aria-hidden />
                    <span>
                      <strong>{factor.label || factor.code}</strong>
                      {factor.direction ? ` · ${factor.direction}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {enhancedRisk?.blendFormula ? (
            <p className="lending-panel__footnote">{enhancedRisk.blendFormula}</p>
          ) : creditInsight?.usedLlm || creditInsight?.model ? (
            <p className="lending-panel__footnote">
              {creditInsight.usedLlm ? 'AI-assisted insight' : 'Rule-based insight'}
              {creditInsight.model ? ` · ${creditInsight.model}` : ''}
            </p>
          ) : null}
        </article>

        {/* 5. Repayment */}
        <article className="lending-panel lending-panel--wide">
          <div className="lending-panel__head">
            <div className="lending-panel__icon lending-panel__icon--repay" aria-hidden>
              <CreditCard size={18} />
            </div>
            <div>
              <h3 className="lending-panel__title">Repayment history</h3>
              <p className="lending-panel__meta">
                {repaymentHealth?.loanId
                  ? `Loan #${repaymentHealth.loanId} · paid / late / overdue / remaining`
                  : 'Payments across linked loans'}
              </p>
            </div>
            {installmentCounts.overdue > 0 ? (
              <span className="lending-pill lending-pill--warn">
                <AlertTriangle size={13} aria-hidden />
                {installmentCounts.overdue} overdue
              </span>
            ) : null}
          </div>

          <div className="lending-repay-stats">
            <div>
              <span>Paid on track</span>
              <strong>{installmentCounts.paid}</strong>
            </div>
            <div>
              <span>Late</span>
              <strong>{installmentCounts.late}</strong>
            </div>
            <div>
              <span>Overdue</span>
              <strong className={installmentCounts.overdue ? 'is-warn' : ''}>
                {installmentCounts.overdue || repaymentHealth?.overdueInstallments || 0}
              </strong>
            </div>
            <div>
              <span>Remaining</span>
              <strong>
                {repaymentHealth?.remainingPrincipal != null
                  ? formatRwf(repaymentHealth.remainingPrincipal)
                  : '—'}
              </strong>
            </div>
          </div>

          {repaymentHealth ? (
            <div className="lending-repay-stats lending-repay-stats--tight">
              <div>
                <span>Principal</span>
                <strong>{formatRwf(repaymentHealth.principal)}</strong>
              </div>
              <div>
                <span>Total paid</span>
                <strong>{formatRwf(repaymentHealth.totalPaid)}</strong>
              </div>
              <div>
                <span>Monthly</span>
                <strong>{formatRwf(repaymentHealth.monthlyPayment)}</strong>
              </div>
              <div>
                <span>Upcoming</span>
                <strong>{installmentCounts.upcoming}</strong>
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
                    : 'No disbursed loan selected for repayment health.'}
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
                            <StatusBadge value={installmentStatusLabel(row.status)} />
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

        {/* 6. Seasonal / weather */}
        <article className="lending-panel">
          <div className="lending-panel__head">
            <div className="lending-panel__icon lending-panel__icon--weather" aria-hidden>
              <CloudRain size={18} />
            </div>
            <div>
              <h3 className="lending-panel__title">Seasonal & weather risk</h3>
              <p className="lending-panel__meta">
                {seasonal.season} · {seasonal.crop}
                {farmWithCoords ? '' : ' · add farm GPS for live weather'}
              </p>
            </div>
            {weatherRisk?.droughtRiskLevel ? (
              <StatusBadge value={weatherRisk.droughtRiskLevel} />
            ) : null}
          </div>

          <div className="lending-season-grid">
            <div>
              <span>Crop stage</span>
              <strong>{seasonal.stage}</strong>
            </div>
            <div>
              <span>Harvest window</span>
              <strong>{seasonal.harvestWindow}</strong>
            </div>
            <div>
              <span>Drought risk</span>
              <strong>{formatRiskLabel(weatherRisk?.droughtRiskLevel) || '—'}</strong>
            </div>
            <div>
              <span>Rain (7d / forecast)</span>
              <strong>
                {weatherRisk
                  ? `${Number(weatherRisk.past7DaysPrecipitationMm || 0).toFixed(0)} / ${Number(
                      weatherRisk.forecast7DaysPrecipitationMm || 0,
                    ).toFixed(0)} mm`
                  : '—'}
              </strong>
            </div>
          </div>

          {weatherRisk?.seasonalStressNote ? (
            <p className="lending-insight-summary">{weatherRisk.seasonalStressNote}</p>
          ) : null}

          {weatherAlerts.length > 0 ? (
            <ul className="lending-flag-list">
              {weatherAlerts.slice(0, 4).map((alert) => (
                <li key={alert} className="lending-flag lending-flag--mid">
                  <AlertTriangle size={14} aria-hidden />
                  <div>
                    <strong>Weather</strong>
                    <span>{alert}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : !weatherRisk ? (
            <p className="lending-empty">
              Weather risk unavailable
              {farmWithCoords ? '.' : ' — farm needs latitude/longitude.'}
            </p>
          ) : null}
        </article>

        {/* 7. Decision notes */}
        <article className="lending-panel">
          <div className="lending-panel__head">
            <div className="lending-panel__icon lending-panel__icon--notes" aria-hidden>
              <NotebookPen size={18} />
            </div>
            <div>
              <h3 className="lending-panel__title">Decision notes</h3>
              <p className="lending-panel__meta">
                Officer comments before approve/reject · stored on this device
              </p>
            </div>
          </div>

          <form className="lending-note-form" onSubmit={handleAddNote}>
            <textarea
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
              placeholder="e.g. Spoke with farmer — farm photos verified, recommend partial approval…"
              rows={3}
              maxLength={600}
            />
            <button type="submit" className="btn-primary" disabled={!noteDraft.trim()}>
              Save note
            </button>
          </form>

          {notes.length === 0 ? (
            <p className="lending-empty">No decision notes yet for this farmer.</p>
          ) : (
            <ul className="lending-note-list">
              {notes.map((note) => (
                <li key={note.id}>
                  <div>
                    <strong>{note.author || 'Bank officer'}</strong>
                    <time dateTime={note.createdAt}>{formatDate(note.createdAt)}</time>
                    <p>{note.text}</p>
                  </div>
                  <button
                    type="button"
                    className="lending-note-delete"
                    aria-label="Delete note"
                    onClick={() => handleDeleteNote(note.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="lending-panel__footnote">
            Contact log / shared CRM notes and peer farmer comparison need backend support next.
          </p>
        </article>
      </div>
      ) : null}
    </section>
  )
}

export default FarmerLendingReview
