import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore, AuthUser } from '@/stores/auth'
import { Button } from '@/components/ui/button'

export default function Header() {
  const { accessToken, user, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Fresh user data (incl. role) from the API; falls back to the store on first paint.
  const { data } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<{ user: AuthUser }>('/auth/me'),
    enabled: !!accessToken,
    staleTime: 60_000,
    retry: false,
  })

  const currentUser = data?.user ?? user

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

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
      <Link to="/" className="text-sm font-semibold">
        Geospatial 3D Platform
      </Link>
      <div className="flex items-center gap-3">
        {currentUser ? (
          <>
            {currentUser.role === 'ADMIN' && (
              <Link to="/admin/reports" className="text-sm text-muted-foreground hover:text-foreground">
                Reports
              </Link>
            )}
            <Link to="/locations/new" className="text-sm text-muted-foreground hover:text-foreground">
              New location
            </Link>
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              {currentUser.username}
              {currentUser.role === 'ADMIN' && (
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
