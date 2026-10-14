import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Inbox } from 'lucide-react'
import { api } from '@/lib/api'
import { AppNotification, REPORT_CATEGORY_LABELS } from '@/lib/types'

/**
 * Owner notifications (report-resolution/08): a bell with an unread badge.
 * Opening the panel lists notices and marks them all read.
 */
export default function NotificationBell() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const { data: unread } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get<{ count: number }>('/notifications/unread-count'),
    staleTime: 30_000,
  })

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<{ notifications: AppNotification[] }>('/notifications'),
    enabled: open,
  })

  const readAll = useMutation({
    mutationFn: () => api.post<{ ok: boolean }>('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  function toggle() {
    const next = !open
    setOpen(next)
    if (next) readAll.mutate()
  }

  const count = unread?.count ?? 0
  const notifications = data?.notifications ?? []

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notifications"
        title="Notifications"
        onClick={toggle}
        className="relative rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium leading-none text-white">
            {count}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-20 mt-2 w-72 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
            <div className="border-b px-3 py-2 text-sm font-medium">Notifications</div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 p-6 text-xs text-muted-foreground">
                  <Inbox className="h-5 w-5" />
                  No notifications.
                </div>
              ) : (
                <ul>
                  {notifications.map((n) => (
                    <li key={n.id} className="border-b px-3 py-2 text-xs last:border-b-0">
                      <p>
                        Your content <span className="font-medium">“{n.contentName}”</span> was removed
                        {n.category ? ` — ${REPORT_CATEGORY_LABELS[n.category]}` : ''}
                      </p>
                      {n.note && <p className="mt-0.5 text-muted-foreground">Note: {n.note}</p>}
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
