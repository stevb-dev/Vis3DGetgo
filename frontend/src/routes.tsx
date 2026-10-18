import { Navigate, Route } from 'react-router-dom'
import GuestRoute from './components/GuestRoute'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import LocationSidebar from './components/LocationSidebar'
import CreateLocationPanel from './components/CreateLocationPanel'
import MapPage from './pages/MapPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AdminReportsPage from './pages/AdminReportsPage'
import MyReportsPage from './pages/MyReportsPage'
import SavedPage from './pages/SavedPage'
import SlugResolver from './components/SlugResolver'

/**
 * Single source of truth for the app's route tree, exported so tests can
 * assert URL → route coverage without mounting the whole app (matchRoutes).
 * Kept out of App.tsx so App stays a single-component module (Fast Refresh).
 */
export const appRoutes = (
  <>
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

    {/* Bare /locations (user-typed, no params): no route would match it and
        the content area would render blank — canonical map URL is '/'. */}
    <Route path="/locations" element={<Navigate to="/" replace />} />

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
  </>
)
