import { useState } from 'react'
import { Flag } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { REPORT_CATEGORIES, REPORT_CATEGORY_LABELS, ReportCategory } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  submitting: boolean
  onSubmit: (category: ReportCategory) => void
  targetLabel: string
}

/**
 * Category picker for flagging junk content (grilling decision: categories,
 * not free text). Shared by image and location reports.
 */
export default function ReportDialog({
  open,
  onOpenChange,
  submitting,
  onSubmit,
  targetLabel,
}: ReportDialogProps) {
  const [category, setCategory] = useState<ReportCategory | null>(null)

  function handleOpenChange(next: boolean) {
    if (!submitting) {
      setCategory(null)
      onOpenChange(next)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-4 w-4" /> Report &ldquo;{targetLabel}&rdquo;
          </DialogTitle>
          <DialogDescription>
            Flag this for review by the administrators. Choose the reason that fits best.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {REPORT_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                'rounded-md border px-3 py-2 text-left text-sm transition-colors',
                category === c
                  ? 'border-primary bg-primary/10 font-medium'
                  : 'hover:bg-muted',
              )}
            >
              {REPORT_CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={submitting || category === null}
            onClick={() => category !== null && onSubmit(category)}
          >
            {submitting ? 'Reporting…' : 'Send report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
