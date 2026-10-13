import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import GuestRoute from './components/GuestRoute'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import LocationSidebar from './components/LocationSidebar'
import { Toaster } from './components/ui/sonner'
import MapPage from './pages/MapPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import CreateLocationPage from './pages/CreateLocationPage'
import AdminReportsPage from './pages/AdminReportsPage'
import SavedPage from './pages/SavedPage'
import SlugResolver from './components/SlugResolver'

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/locations/new" element={<CreateLocationPage />} />
          <Route path="/saved" element={<SavedPage />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route path="/admin/reports" element={<AdminReportsPage />} />
        </Route>

        {/* Share-slug alias: resolves coords → canonical /locations/:id. */}
        <Route path="/locations/:slug/:coords" element={<SlugResolver />} />

        {/* Map stays mounted; the location detail renders as a sidebar. */}
        <Route path="/" element={<MapPage />}>
          <Route path="locations/:id" element={<LocationSidebar />} />
        </Route>
      </Routes>
      <Toaster />
    </div>
  )
}
