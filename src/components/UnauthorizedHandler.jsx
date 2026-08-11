import { useEffect } from 'react'
import { toast } from 'react-toastify'
import { setUnauthorizedHandler } from '../api/client'
import { usePortalCopy } from '../context/AuthLocaleContext'

/** Wires session-expired toast using the active portal locale. */
export function UnauthorizedHandler() {
  const { shared } = usePortalCopy()

  useEffect(() => {
    setUnauthorizedHandler(() => {
      toast.error(shared?.toasts?.sessionExpired || 'Session expired. Please sign in again.')
      window.location.assign('/login')
    })
  }, [shared])

  return null
}

export default UnauthorizedHandler
