import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'

/** Guards guest-only pages (login/register); sends authenticated users home. */
export default function GuestRoute() {
  const accessToken = useAuthStore((s) => s.accessToken)
  if (accessToken) return <Navigate to="/" replace />
  return <Outlet />
}
