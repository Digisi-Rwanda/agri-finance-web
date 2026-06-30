import { Navigate, useLocation } from 'react-router-dom'
import { getCurrentUser, hasAnyRole, isAuthenticated } from '../services/auth'
import { getHomePathForRole } from '../utils/roles'

function ProtectedRoute({ children, allowedRoles }) {
  const location = useLocation()

  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles?.length && !hasAnyRole(allowedRoles)) {
    return <Navigate to={getHomePathForRole(getCurrentUser()?.role)} replace />
  }

  return children
}

export default ProtectedRoute
