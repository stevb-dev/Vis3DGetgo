import { useQuery } from '@tanstack/react-query'
import { Inbox, MapPin } from 'lucide-react'
import { api } from '@/lib/api'
import { MyReport, REPORT_CATEGORY_LABELS, REPORT_STATUS_LABELS } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * Reporter's own reports (report-resolution/07): a plain list of the user's
 * reports with their outcome — no unread marker.
 */
export default function MyReportsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-reports'],
    queryFn: () => api.get<{ reports: MyReport[] }>('/my-reports'),
  })

  const reports = data?.reports ?? []

  function targetLabel(r: MyReport): string {
    if (r.image) return `Image "${r.image.originalName}"`
    if (r.location) return `"${r.location.name}"`
    return 'content'
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
      <h1 className="mb-4 text-lg font-semibold">My reports</h1>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {isError && <p className="text-sm text-destructive">Failed to load your reports</p>}

      {!isLoading && !isError && reports.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed p-8 text-sm text-muted-foreground">
          <Inbox className="h-6 w-6" />
          You haven't reported anything yet.
        </div>
      )}

      {reports.length > 0 && (
        <ul className="space-y-3">
          {reports.map((report) => (
            <li key={report.id} className="flex items-start gap-3 rounded-md border p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted">
                {report.image ? (
                  <img
                    src={report.image.filePath}
                    alt=""
                    loading="lazy"
                    className="h-10 w-10 rounded-md object-cover"
                  />
                ) : (
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{targetLabel(report)}</p>
                <p className="text-xs text-muted-foreground">
                  {REPORT_CATEGORY_LABELS[report.category]} · reported {new Date(report.createdAt).toLocaleString()}
                </p>
                {report.status === 'DISMISSED' && report.note && (
                  <p className="mt-1 text-xs text-muted-foreground">Admin note: “{report.note}”</p>
                )}
              </div>
              <span
                className={cn(
                  'shrink-0 rounded px-1.5 py-0.5 text-xs font-medium',
                  report.status === 'OPEN'
                    ? 'bg-primary/10 text-primary'
                    : report.status === 'RESOLVED'
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-muted text-muted-foreground',
                )}
              >
                {REPORT_STATUS_LABELS[report.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
