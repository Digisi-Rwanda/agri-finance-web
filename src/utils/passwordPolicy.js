/**
 * Shared password rules for every screen that sets a password.
 * Pure logic only — the labels live in the auth copy so they can be translated.
 */

export const PASSWORD_MIN_LENGTH = 8
/** Length at which a compliant password is promoted to the top strength band. */
export const PASSWORD_STRONG_LENGTH = 12

export const PASSWORD_RULE_IDS = ['length', 'case', 'number', 'symbol', 'notCommon']

/** Substrings that make a password guessable regardless of how it is decorated. */
const COMMON_WEAK = [
  '123456',
  '12345678',
  'abc123',
  'password',
  'passw0rd',
  'qwerty',
  'azerty',
  'letmein',
  'welcome',
  'iloveyou',
  'admin',
  'agritrust',
  'agrifinance',
  'rwanda',
  'kigali',
]

/** True when the value contains a run of repeated, ascending or descending characters. */
function hasCharacterRun(value, runLength = 4) {
  let repeat = 1
  let ascending = 1
  let descending = 1

  for (let index = 1; index < value.length; index += 1) {
    const step = value.charCodeAt(index) - value.charCodeAt(index - 1)
    repeat = step === 0 ? repeat + 1 : 1
    ascending = step === 1 ? ascending + 1 : 1
    descending = step === -1 ? descending + 1 : 1

    if (repeat >= runLength || ascending >= runLength || descending >= runLength) return true
  }
  return false
}

/** Splits emails and names into the words an attacker would try first. */
function tokenize(value) {
  return String(value || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4)
}

function isPredictable(password, blocklist) {
  const lower = password.toLowerCase()
  if (COMMON_WEAK.some((entry) => lower.includes(entry))) return true
  if (hasCharacterRun(lower)) return true
  return blocklist.flatMap(tokenize).some((token) => lower.includes(token))
}

/**
 * @param password  the candidate password
 * @param blocklist personal values (email, full name) the password must not contain
 */
export function evaluatePassword(password = '', { blocklist = [] } = {}) {
  const value = String(password)

  const rules = [
    { id: 'length', met: value.length >= PASSWORD_MIN_LENGTH },
    { id: 'case', met: /[a-z]/.test(value) && /[A-Z]/.test(value) },
    { id: 'number', met: /\d/.test(value) },
    { id: 'symbol', met: /[^A-Za-z0-9]/.test(value) },
    { id: 'notCommon', met: value.length > 0 && !isPredictable(value, blocklist) },
  ]

  const met = rules.filter((rule) => rule.met).length
  const valid = met === rules.length

  let score = 0
  if (met >= 2) score = 1
  if (met >= 3) score = 2
  if (met >= 4) score = 3
  if (valid) score = value.length >= PASSWORD_STRONG_LENGTH ? 4 : 3

  return { rules, met, total: rules.length, score, valid }
}

export const isPasswordAcceptable = (password, options) =>
  evaluatePassword(password, options).valid
