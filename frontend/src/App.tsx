import { useEffect } from 'react'
import { Routes, useLocation, useNavigationType } from 'react-router-dom'
import Header from './components/Header'
import { trackLocation } from './lib/locationHistory'
import { Toaster } from './components/ui/sonner'
import { appRoutes } from './routes'

export default function App() {
  // Record every navigation so BackToMapButton can inspect the previous entry
  // (react-router does not expose it). App lives inside <BrowserRouter>.
  const location = useLocation()
  const navigationType = useNavigationType()
  useEffect(() => {
    trackLocation(location, navigationType)
  }, [location, navigationType])

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <Routes>{appRoutes}</Routes>
      <Toaster />
    </div>
  )
}
