import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { RouteSkeleton } from './skeletons'

/**
 * Wraps authenticated routes. Unauthenticated users are sent to /login.
 * Use this as a layout route so all nested routes are protected by default.
 */
export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <RouteSkeleton />
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
