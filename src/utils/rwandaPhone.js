export function normalizeRwandaPhone(value = '') {
  const digits = String(value).replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('250')) return `+${digits}`
  if (digits.startsWith('0')) return `+250${digits.slice(1)}`
  if (digits.length === 9) return `+250${digits}`
  return `+${digits}`
}

export function formatRwandaPhoneDisplay(value = '') {
  const normalized = normalizeRwandaPhone(value)
  const digits = normalized.replace(/\D/g, '')
  if (!digits.startsWith('250') || digits.length < 12) return value
  const local = digits.slice(3)
  return `+250 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`.trim()
}

export function isValidRwandaMobile(value = '') {
  const normalized = normalizeRwandaPhone(value)
  return /^\+2507\d{8}$/.test(normalized)
}

export const RWANDA_PHONE_PLACEHOLDER = '+250 7XX XXX XXX'
