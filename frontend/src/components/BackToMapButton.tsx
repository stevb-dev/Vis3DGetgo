import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getPreviousPathname, isMapPath } from '@/lib/locationHistory'

/**
 * "Back to map" affordance for full-page routes.
 *
 * Goes back through history only when the previous in-app entry was the map
 * (preserving its view state); otherwise navigates straight to the map, so
 * the button always lands there even on direct visits or when the previous
 * page was another list page.
 */
export default function BackToMapButton({ className }: { className?: string }) {
  const navigate = useNavigate()

  function handleClick() {
    const prev = getPreviousPathname()
    if (prev !== null && isMapPath(prev)) navigate(-1)
    else navigate('/')
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleClick} className={className}>
      <ArrowLeft aria-hidden="true" />
      Back to map
    </Button>
  )
}
