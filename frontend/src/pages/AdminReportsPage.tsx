import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronDown, Inbox, MapPin, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { AdminReport, REPORT_CATEGORY_LABELS, REPORT_STATUS_LABELS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type ResolveAction = 'DELETE' | 'DISMISS'
type StatusTab = 'OPEN' | 'CLOSED'

/**
 * Admin review page (report-resolution/05): two-action resolution — Delete
 * content (soft-delete, cascades) or Dismiss — plus Open/Closed tabs.
 */
export default function AdminReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status: StatusTab = searchParams.get('status') === 'CLOSED' ? 'CLOSED' : 'OPEN'
  const queryClient = useQueryClient()

  const [menuOpenId, setMenuOpenId] = useState<number | null>(null)
  const [resolveTarget, setResolveTarget] = useState<{ report: AdminReport; action: ResolveAction } | null>(null)
  const [note, setNote] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['reports', status],
    queryFn: () => api.get<{ reports: AdminReport[] }>(`/reports?status=${status}`),
  })

  const resolve = useMutation({
    mutationFn: ({ id, action, note }: { id: number; action: ResolveAction; note?: string }) =>
      api.patch<{ report: AdminReport }>(`/reports/${id}`, { action, note: note || undefined }),
    onSuccess: (_data, vars) => {
      setResolveTarget(null)
      setNote('')
      setMenuOpenId(null)
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['reports', 'unread-count'] })
      toast.success(vars.action === 'DELETE' ? 'Content removed' : 'Report dismissed')
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Could not resolve the report')
    },
  })

  // Reset the admin's unread watermark when they view the Open tab (ticket 06).
  const markSeen = useMutation({
    mutationFn: () => api.post<{ ok: boolean }>('/reports/seen'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports', 'unread-count'] }),
  })

  useEffect(() => {
    if (status === 'OPEN') markSeen.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const reports = data?.reports ?? []

  function setTab(next: StatusTab) {
    setSearchParams(next === 'OPEN' ? {} : { status: next }, { replace: true })
  }

  function openResolve(report: AdminReport, action: ResolveAction) {
    setMenuOpenId(null)
    setNote('')
    setResolveTarget({ report, action })
  }

  function commitResolve() {
    if (!resolveTarget) return
    resolve.mutate({ id: resolveTarget.report.id, action: resolveTarget.action, note })
  }

  function targetLocationId(report: AdminReport): number | null {
    if (report.imageId !== null && report.image) return report.image.locationId
    if (report.locationId !== null && report.location) return report.location.id
    return null
  }

  // Only link through when the content is still live (deleted → the sidebar 404s).
  function isTargetDeleted(report: AdminReport): boolean {
    if (report.image) return report.image.deletedAt !== null
    if (report.location) return report.location.deletedAt !== null
    return false
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Reports</h1>
        <div className="flex rounded-md border p-0.5 text-sm">
          {(['OPEN', 'CLOSED'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setTab(s)}
              className={cn(
                'rounded px-3 py-1 transition-colors',
                status === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {s === 'OPEN' ? 'Open' : 'Closed'}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading…</p>}

      {isError && <p className="mt-4 text-sm text-destructive">Failed to load reports</p>}

      {!isLoading && !isError && reports.length === 0 && (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-md border border-dashed p-8 text-sm text-muted-foreground">
          <Inbox className="h-6 w-6" />
          {status === 'OPEN' ? 'No open reports. All clear!' : 'No closed reports yet.'}
        </div>
      )}

      <ul className="mt-4 space-y-3">
        {reports.map((report) => {
          const locId = targetLocationId(report)
          const deleted = isTargetDeleted(report)
          const isClosed = status === 'CLOSED'
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
                  {report.imageId !== null ? 'Image' : 'Location'} · {REPORT_CATEGORY_LABELS[report.category]}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {report.location?.name ?? `on location #${report.image?.locationId}`}
                  {' · reported by '}
                  <span className="font-medium">{report.reporter.username}</span>
                  {' · '}
                  {new Date(report.createdAt).toLocaleString()}
                </p>
                {isClosed && (
                  <p className="mt-1 text-xs">
                    <span
                      className={cn(
                        'rounded px-1.5 py-0.5 font-medium',
                        report.status === 'RESOLVED'
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {REPORT_STATUS_LABELS[report.status]}
                    </span>
                    {report.closedAt && (
                      <span className="ml-2 text-muted-foreground">{new Date(report.closedAt).toLocaleString()}</span>
                    )}
                    {report.note && <span className="ml-2 text-muted-foreground">— “{report.note}”</span>}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {locId !== null && !deleted && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/locations/${locId}`}>Open location</Link>
                  </Button>
                )}
                {!isClosed && (
                  <div className="relative">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setMenuOpenId(menuOpenId === report.id ? null : report.id)}
                    >
                      Resolve <ChevronDown className="ml-1 h-3.5 w-3.5" />
                    </Button>
                    {menuOpenId === report.id && (
                      <>
                        <button
                          type="button"
                          aria-label="Close menu"
                          className="fixed inset-0 z-10 cursor-default"
                          onClick={() => setMenuOpenId(null)}
                        />
                        <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
                          <button
                            type="button"
                            onClick={() => openResolve(report, 'DELETE')}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" /> Delete content
                          </button>
                          <button
                            type="button"
                            onClick={() => openResolve(report, 'DISMISS')}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                          >
                            <X className="h-3.5 w-3.5" /> Dismiss
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <Dialog open={resolveTarget !== null} onOpenChange={(open) => !open && !resolve.isPending && setResolveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {resolveTarget?.action === 'DELETE' ? 'Delete reported content?' : 'Dismiss report?'}
            </DialogTitle>
            <DialogDescription>
              {resolveTarget?.action === 'DELETE'
                ? 'This hides the reported content from the map (and, for a location, all of its images). It cannot be undone.'
                : 'Close the report with no action taken. The content stays as-is.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder={
                resolveTarget?.action === 'DELETE'
                  ? 'Optional note for the content owner…'
                  : 'Optional note for the reporter…'
              }
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveTarget(null)} disabled={resolve.isPending}>
              Cancel
            </Button>
            <Button
              variant={resolveTarget?.action === 'DELETE' ? 'destructive' : 'default'}
              onClick={commitResolve}
              disabled={resolve.isPending}
            >
              {resolve.isPending
                ? 'Saving…'
                : resolveTarget?.action === 'DELETE' ? (
                  <>
                    <Check className="mr-1 h-3.5 w-3.5" /> Delete content
                  </>
                ) : (
                  'Dismiss'
                )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
