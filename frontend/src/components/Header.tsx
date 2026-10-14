import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore, AuthUser } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import NotificationBell from '@/components/NotificationBell'

export default function Header() {
  const { accessToken, user, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const location = useLocation()
  // Carry the active tile layer into the create-location map (tile-layers).
  const newLocationLayer = new URLSearchParams(location.search).get('layer')
  const newLocationTo = newLocationLayer ? `/locations/new?layer=${newLocationLayer}` : '/locations/new'

  // Fresh user data (incl. role) from the API; falls back to the store on first paint.
  const { data } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<{ user: AuthUser }>('/auth/me'),
    enabled: !!accessToken,
    staleTime: 60_000,
    retry: false,
  })

  const currentUser = data?.user ?? user
  const isAdmin = currentUser?.role === 'ADMIN'

  // Unread OPEN-report count for the admin badge (report-resolution/06).
  const { data: reportsUnread } = useQuery({
    queryKey: ['reports', 'unread-count'],
    queryFn: () => api.get<{ count: number }>('/reports/unread-count'),
    enabled: !!accessToken && isAdmin,
    staleTime: 30_000,
    retry: false,
  })
  const reportCount = reportsUnread?.count ?? 0

  async function handleLogout() {
    try {
      await api.post<{ ok: boolean }>('/auth/logout')
    } catch {
      // Cookie may already be gone; clearing local state is what matters.
    }
    clearAuth()
    queryClient.removeQueries({ queryKey: ['me'] })
    navigate('/')
  }

  // z-[1100] lifts the header above Leaflet's panes/controls (max z-1000) so
  // dropdowns like the notification bell never render behind the map.
  return (
    <header className="relative z-[1100] flex h-14 shrink-0 items-center justify-between border-b px-4">
      <Link to="/" className="text-sm font-semibold">
        Geospatial 3D Platform
      </Link>
      <div className="flex items-center gap-3">
        {currentUser ? (
          <>
            {isAdmin && (
              <Link
                to="/admin/reports"
                className="relative text-sm text-muted-foreground hover:text-foreground"
              >
                Reports
                {reportCount > 0 && (
                  <span className="absolute -right-3 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium leading-none text-white">
                    {reportCount}
                  </span>
                )}
              </Link>
            )}
            <Link to="/my-reports" className="text-sm text-muted-foreground hover:text-foreground">
              My reports
            </Link>
            <Link to={newLocationTo} className="text-sm text-muted-foreground hover:text-foreground">
              New location
            </Link>
            <Link to="/saved" className="text-sm text-muted-foreground hover:text-foreground">
              Saved
            </Link>
            <NotificationBell />
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              {currentUser.username}
              {isAdmin && (
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium">ADMIN</span>
              )}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Log out
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Log in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/register">Register</Link>
            </Button>
          </>
        )}
      </div>
    </header>
  )
}
