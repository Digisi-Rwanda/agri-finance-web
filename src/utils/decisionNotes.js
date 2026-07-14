const STORAGE_KEY = 'agritrust.bank.decisionNotes'

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function getDecisionNotes(farmerId) {
  const key = String(farmerId)
  const store = readStore()
  const list = Array.isArray(store[key]) ? store[key] : []
  return [...list].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
}

export function addDecisionNote(farmerId, { text, author }) {
  const trimmed = String(text || '').trim()
  if (!trimmed) return getDecisionNotes(farmerId)

  const key = String(farmerId)
  const store = readStore()
  const next = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: trimmed,
    author: author || 'Bank officer',
    createdAt: new Date().toISOString(),
  }
  store[key] = [next, ...(Array.isArray(store[key]) ? store[key] : [])].slice(0, 40)
  writeStore(store)
  return getDecisionNotes(farmerId)
}

export function deleteDecisionNote(farmerId, noteId) {
  const key = String(farmerId)
  const store = readStore()
  store[key] = (Array.isArray(store[key]) ? store[key] : []).filter((n) => n.id !== noteId)
  writeStore(store)
  return getDecisionNotes(farmerId)
}
