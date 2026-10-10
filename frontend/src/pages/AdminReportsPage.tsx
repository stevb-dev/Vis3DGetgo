import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Inbox, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { AdminReport, REPORT_CATEGORY_LABELS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Admin review page for user reports (grilling decision: minimal but
 * end-to-end — target, category, reporter, link to the location, resolve).
 */
export default function AdminReportsPage() {
  const [status, setStatus] = useState<'OPEN' | 'RESOLVED'>('OPEN')
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['reports', status],
    queryFn: () => api.get<{ reports: AdminReport[] }>(`/reports?status=${status}`),
  })

  const resolve = useMutation({
    mutationFn: (id: number) => api.patch<{ report: AdminReport }>(`/reports/${id}`, { status: 'RESOLVED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      toast.success('Report resolved')
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Could not resolve the report')
    },
  })

  const reports = data?.reports ?? []

  function targetLocationId(report: AdminReport): number | null {
    if (report.imageId !== null && report.image) return report.image.locationId
    if (report.locationId !== null && report.location) return report.location.id
    return null
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Reports</h1>
        <div className="flex rounded-md border p-0.5 text-sm">
          {(['OPEN', 'RESOLVED'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={cn(
                'rounded px-3 py-1 transition-colors',
                status === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {s === 'OPEN' ? 'Open' : 'Resolved'}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading…</p>}

      {isError && (
        <p className="mt-4 text-sm text-destructive">Failed to load reports</p>
      )}

      {!isLoading && !isError && reports.length === 0 && (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-md border border-dashed p-8 text-sm text-muted-foreground">
          <Inbox className="h-6 w-6" />
          {status === 'OPEN' ? 'No open reports. All clear!' : 'Nothing resolved yet.'}
        </div>
      )}

      <ul className="mt-4 space-y-3">
        {reports.map((report) => {
          const locId = targetLocationId(report)
          return (
            <li key={report.id} className="flex items-center gap-4 rounded-md border p-3">
              {report.image ? (
                <img
                  src={report.image.filePath}
                  alt="Reported"
                  loading="lazy"
                  className="h-16 w-24 shrink-0 rounded-md border object-cover"
                />
              ) : (
                <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-md border bg-muted">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {report.imageId !== null ? 'Image' : 'Location'} ·{' '}
                  {REPORT_CATEGORY_LABELS[report.category]}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {report.location?.name ?? `on location #${report.image?.locationId}`}
                  {' · reported by '}
                  <span className="font-medium">{report.reporter.username}</span>
                  {' · '}
                  {new Date(report.createdAt).toLocaleString()}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {locId !== null && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/locations/${locId}`}>Open location</Link>
                  </Button>
                )}
                {status === 'OPEN' && (
                  <Button
                    size="sm"
                    onClick={() => resolve.mutate(report.id)}
                    disabled={resolve.isPending}
                  >
                    <Check className="mr-1 h-3.5 w-3.5" /> Resolve
                  </Button>
                )}
                {status === 'RESOLVED' && report.resolvedAt && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(report.resolvedAt).toLocaleString()}
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
