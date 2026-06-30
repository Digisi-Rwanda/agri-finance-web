/** Rwanda Franc display label (avoids Intl showing abbreviated "RF"). */
export const CURRENCY_LABEL = 'Rwf'

export const formatRwf = (amount, maximumFractionDigits = 0) => {
  const value = Number(amount)
  if (Number.isNaN(value)) return `0 ${CURRENCY_LABEL}`
  const formatted = value.toLocaleString('en-RW', {
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits > 0 ? maximumFractionDigits : 0,
  })
  return `${formatted} ${CURRENCY_LABEL}`
}

export const formatRwfCompact = (amount) => {
  const value = Number(amount)
  if (Number.isNaN(value)) return `0 ${CURRENCY_LABEL}`
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toFixed(1)}B ${CURRENCY_LABEL}`
  }
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1)}M ${CURRENCY_LABEL}`
  }
  if (abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(1)}K ${CURRENCY_LABEL}`
  }
  return formatRwf(value)
}
