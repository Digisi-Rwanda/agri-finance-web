/**
 * Transparent recommended-limit heuristic for bank underwriting UI.
 * Not a regulatory credit decision — mirrors score + farm capacity + activity.
 */
export function estimateLoanAffordability({
  creditScore,
  riskLevel,
  totalAcreage = 0,
  activityCount = 0,
  outstandingBalance = 0,
  pendingLoanAmount = 0,
} = {}) {
  const score =
    creditScore == null || Number.isNaN(Number(creditScore)) ? null : Number(creditScore)
  const acres = Math.max(0, Number(totalAcreage) || 0)
  const activity = Math.max(0, Number(activityCount) || 0)
  const outstanding = Math.max(0, Number(outstandingBalance) || 0)
  const pending = Math.max(0, Number(pendingLoanAmount) || 0)

  const BASE_PER_ACRE = 180_000
  const FLOOR = 50_000
  const CEILING = 5_000_000

  if (score == null) {
    return {
      recommendedLimit: null,
      capacity: null,
      availableLimit: null,
      scoreMultiplier: null,
      activityBoost: null,
      riskHaircut: null,
      bases: { acres, activity, outstanding, pending, BASE_PER_ACRE },
      reasons: ['Credit score unavailable — limit cannot be estimated.'],
      posture: 'unknown',
    }
  }

  const risk = String(riskLevel || '').toUpperCase()
  const riskHaircut = risk === 'HIGH' ? 0.45 : risk === 'MEDIUM' ? 0.7 : risk === 'LOW' ? 1 : 0.85
  const scoreMultiplier = Math.min(1, Math.max(0.15, score / 100))
  const activityBoost = Math.min(0.3, activity * 0.015)
  const farmCapacity = Math.max(FLOOR, acres * BASE_PER_ACRE)
  const capacity = Math.round(farmCapacity * scoreMultiplier * (1 + activityBoost) * riskHaircut)
  const capped = Math.min(CEILING, Math.max(FLOOR, capacity))
  const availableLimit = Math.max(0, capped - outstanding - pending)

  const reasons = [
    `Farm capacity ≈ ${acres || 0} ac × ${BASE_PER_ACRE.toLocaleString()} RWF`,
    `Score factor ${(scoreMultiplier * 100).toFixed(0)}% (score ${score}/100)`,
    `Activity boost +${(activityBoost * 100).toFixed(0)}% from ${activity} payment/ledger events`,
    risk
      ? `Risk haircut ${(riskHaircut * 100).toFixed(0)}% (${risk.toLowerCase()} risk)`
      : 'Risk haircut 85% (risk unknown)',
  ]

  if (outstanding > 0) reasons.push(`Minus outstanding balance ${outstanding.toLocaleString()} RWF`)
  if (pending > 0) reasons.push(`Minus pending application ${pending.toLocaleString()} RWF`)

  let posture = 'cautious'
  if (availableLimit >= 500_000 && score >= 70 && risk !== 'HIGH') posture = 'comfortable'
  else if (availableLimit >= 150_000 && score >= 40 && risk !== 'HIGH') posture = 'moderate'
  else if (risk === 'HIGH' || availableLimit < 80_000) posture = 'tight'

  return {
    recommendedLimit: capped,
    capacity: capped,
    availableLimit,
    scoreMultiplier,
    activityBoost,
    riskHaircut,
    bases: { acres, activity, outstanding, pending, BASE_PER_ACRE },
    reasons,
    posture,
  }
}

export function summarizeInstallments(schedule = []) {
  const counts = { paid: 0, late: 0, overdue: 0, upcoming: 0, other: 0 }
  for (const row of schedule) {
    const status = String(row?.status || '').toUpperCase()
    if (status.includes('OVERDUE')) counts.overdue += 1
    else if (status.includes('LATE')) counts.late += 1
    else if (status.includes('PAID') || status.includes('SETTLED') || status.includes('ON_TIME')) {
      counts.paid += 1
    } else if (
      status.includes('DUE') ||
      status.includes('PENDING') ||
      status.includes('UPCOMING') ||
      status.includes('SCHEDULED')
    ) {
      counts.upcoming += 1
    } else {
      counts.other += 1
    }
  }
  return counts
}

/** Rough Rwanda agricultural season outlook from calendar month + crop. */
export function getSeasonalOutlook(cropType, referenceDate = new Date()) {
  const month = referenceDate.getMonth() + 1
  let season = 'Off-season'
  let stage = 'Land preparation / residual activity'
  let harvestWindow = 'Depends on planting date'

  if (month >= 9 && month <= 12) {
    season = 'Season A'
    stage = month <= 10 ? 'Planting / early growth' : 'Vegetative / flowering'
    harvestWindow = 'Jan–Feb'
  } else if (month >= 1 && month <= 2) {
    season = 'Season A harvest'
    stage = 'Harvest / post-harvest'
    harvestWindow = 'Now – Feb'
  } else if (month >= 3 && month <= 6) {
    season = 'Season B'
    stage = month <= 4 ? 'Planting / early growth' : 'Vegetative / reproductive'
    harvestWindow = 'Jun–Jul'
  } else if (month === 7 || month === 8) {
    season = 'Season B harvest / dry'
    stage = 'Harvest / dry-season management'
    harvestWindow = 'Jul–Aug'
  }

  return {
    season,
    stage,
    harvestWindow,
    crop: cropType || 'Mixed / unspecified',
  }
}
