import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'

/**
 * Guards authenticated pages; redirects to /login when no access token is
 * present.
 *
 * Used two ways:
 * - as a layout route (no children) it renders <Outlet /> for its child routes;
 * - inline (with children) it renders the children directly. Inline mode keeps
 *   the caller's Outlet context intact — a layout Outlet resets
 *   `useOutletContext` for its subtree, which broke the create panel (it reads
 *   MapPage's <Outlet context> and sat under a ProtectedRoute layout Outlet).
 */
export default function ProtectedRoute({ children }: { children?: ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const location = useLocation()
  if (!accessToken) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children ? <>{children}</> : <Outlet />
}
