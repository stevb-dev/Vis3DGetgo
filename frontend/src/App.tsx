import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import GuestRoute from './components/GuestRoute'
import ProtectedRoute from './components/ProtectedRoute'
import LocationSidebar from './components/LocationSidebar'
import { Toaster } from './components/ui/sonner'
import MapPage from './pages/MapPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import CreateLocationPage from './pages/CreateLocationPage'

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
        </Route>

        {/* Map stays mounted; the location detail renders as a sidebar. */}
        <Route path="/" element={<MapPage />}>
          <Route path="locations/:id" element={<LocationSidebar />} />
        </Route>
      </Routes>
      <Toaster />
    </div>
  )
}
