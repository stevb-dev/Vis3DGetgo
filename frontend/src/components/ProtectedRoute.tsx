import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'

/** Guards authenticated pages; redirects to /login when no access token is present. */
export default function ProtectedRoute() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const location = useLocation()
  if (!accessToken) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}
