import { Navigate, useLocation } from 'react-router-dom'
import useAuth from '../hooks/useAuth'
import { normalizeRole } from '../utils/roles'

function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (allowedRoles?.length && !allowedRoles.map(normalizeRole).includes(normalizeRole(user?.role))) {
    return <Navigate to="/" replace />
  }

  return children
}

export default ProtectedRoute
