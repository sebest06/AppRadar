import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import CreateRace from './pages/CreateRace'
import LiveRace from './pages/LiveRace'
import Results from './pages/Results'
import RaceNotifications from './pages/RaceNotifications'
import Profile from './pages/Profile'
import EditRace from './pages/EditRace'
import Replay from './pages/Replay'
import OrganizerPanel from './pages/OrganizerPanel'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/races/new"
              element={
                <ProtectedRoute>
                  <CreateRace />
                </ProtectedRoute>
              }
            />
            <Route path="/races/:id/live" element={<LiveRace />} />
            <Route path="/races/:id/results" element={<Results />} />
            <Route path="/races/:id/notifications" element={<RaceNotifications />} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/races/:id/edit" element={<ProtectedRoute><EditRace /></ProtectedRoute>} />
            <Route path="/races/:id/replay" element={<Replay />} />
            <Route path="/races/:id/organizer" element={<ProtectedRoute><OrganizerPanel /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
