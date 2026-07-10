import { Navigate } from 'react-router-dom'

const LAST_FARMER_KEY = 'agri.lastFarmerId'

export function rememberLastFarmerId(farmerId) {
  const id = Number(farmerId)
  if (!id) return
  try {
    sessionStorage.setItem(LAST_FARMER_KEY, String(id))
  } catch {
    // ignore storage errors
  }
}

export function getLastFarmerId() {
  try {
    const value = Number(sessionStorage.getItem(LAST_FARMER_KEY))
    return value || null
  } catch {
    return null
  }
}

/** Opens the last viewed farmer profile, or the farmers directory if none yet. */
export default function FarmerProfileRedirect() {
  const lastId = getLastFarmerId()
  if (lastId) {
    return <Navigate to={`/farmer/${lastId}`} replace />
  }
  return <Navigate to="/farmer" replace />
}
