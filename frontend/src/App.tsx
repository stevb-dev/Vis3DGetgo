import { useEffect } from 'react'
import { Routes, Route, useLocation, useNavigationType } from 'react-router-dom'
import Header from './components/Header'
import { trackLocation } from './lib/locationHistory'
import GuestRoute from './components/GuestRoute'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import LocationSidebar from './components/LocationSidebar'
import CreateLocationPanel from './components/CreateLocationPanel'
import { Toaster } from './components/ui/sonner'
import MapPage from './pages/MapPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AdminReportsPage from './pages/AdminReportsPage'
import MyReportsPage from './pages/MyReportsPage'
import SavedPage from './pages/SavedPage'
import SlugResolver from './components/SlugResolver'

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
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/saved" element={<SavedPage />} />
          <Route path="/my-reports" element={<MyReportsPage />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route path="/admin/reports" element={<AdminReportsPage />} />
        </Route>

        {/* Share-slug alias: resolves coords → canonical /locations/:id. */}
        <Route path="/locations/:slug/:coords" element={<SlugResolver />} />

        {/* Map stays mounted; the location detail renders as a sidebar and the
            create flow as a panel (create-location-flow: the create route is
            nested so entering/leaving it never remounts the map). The static
            "locations/new" segment ranks above the dynamic "locations/:id". */}
        <Route path="/" element={<MapPage />}>
          {/* Inline guard (not a layout route): a layout Outlet here would reset
              useOutletContext for the panel — CreateLocationPanel reads MapPage's
              <Outlet context> (picked spot + navigateMap). */}
          <Route
            path="locations/new"
            element={
              <ProtectedRoute>
                <CreateLocationPanel />
              </ProtectedRoute>
            }
          />
          <Route path="locations/:id" element={<LocationSidebar />} />
        </Route>
      </Routes>
      <Toaster />
    </div>
  )
}
