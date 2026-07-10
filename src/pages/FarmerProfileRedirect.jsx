import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getFarmers } from '../services/farmerService'

const LAST_FARMER_KEY = 'agri.lastFarmerMeta'

function resolvePhotoUrl(raw) {
  if (!raw) return null
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:')) return raw
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'
  const origin = String(apiBase).replace(/\/api\/?$/, '')
  return `${origin}${raw.startsWith('/') ? raw : `/${raw}`}`
}

export function rememberLastFarmerId(farmerId, meta = {}) {
  const id = Number(farmerId)
  if (!id) return
  try {
    const payload = {
      id,
      name: meta.name || meta.fullName || '',
      photo: resolvePhotoUrl(
        meta.photo ||
          meta.profilePhotoUrl ||
          meta.profilePhoto ||
          meta.photoUrl ||
          null,
      ),
    }
    sessionStorage.setItem(LAST_FARMER_KEY, JSON.stringify(payload))
  } catch {
    // ignore storage errors
  }
}

export function getLastFarmerId() {
  const meta = getLastFarmerMeta()
  return meta?.id || null
}

export function getLastFarmerMeta() {
  try {
    const raw = sessionStorage.getItem(LAST_FARMER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const id = Number(parsed?.id)
    if (!id) return null
    return {
      id,
      name: parsed.name || '',
      photo: parsed.photo || null,
    }
  } catch {
    return null
  }
}

/** Opens a real farmer profile page with full identification details. */
export default function FarmerProfileRedirect() {
  const [target, setTarget] = useState(null)

  useEffect(() => {
    let cancelled = false

    const go = async () => {
      const lastId = getLastFarmerId()
      if (lastId) {
        if (!cancelled) setTarget(`/farmer/${lastId}`)
        return
      }

      try {
        const farmers = await getFarmers()
        const first = Array.isArray(farmers) ? farmers[0] : null
        if (first?.farmerId) {
          rememberLastFarmerId(first.farmerId, first)
          if (!cancelled) setTarget(`/farmer/${first.farmerId}`)
          return
        }
      } catch {
        // fall through to directory
      }

      if (!cancelled) setTarget('/farmer')
    }

    go()
    return () => {
      cancelled = true
    }
  }, [])

  if (!target) {
    return (
      <section className="dashboard-page farmer-profile-page">
        <div className="widgets four">
          {[1, 2, 3, 4].map((id) => (
            <article key={id} className="widget card dashboard-skeleton" />
          ))}
        </div>
      </section>
    )
  }

  return <Navigate to={target} replace />
}
