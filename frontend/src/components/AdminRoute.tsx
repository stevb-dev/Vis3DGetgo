import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'

/** Guards admin pages; redirects to login (unauthenticated) or home (non-admin). */
export default function AdminRoute() {
  const { accessToken, user } = useAuthStore()
  const location = useLocation()

  if (!accessToken) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />
  return <Outlet />
}
