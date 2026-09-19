import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppShell } from './components/AppShell'
import { DiscoverPage } from './pages/DiscoverPage'
import { LoginPage } from './pages/LoginPage'
import { LocationPage } from './pages/LocationPage'
import { ChatsPage } from './pages/ChatsPage'
import { ChatDetailPage } from './pages/ChatDetailPage'
import { ProfilePage } from './pages/ProfilePage'

/**
 * Discover is public (matches the prototype's browsable swipe deck); signing
 * in is only required for messaging, chats, profile editing, and location.
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<AppShell />}>
            <Route path="/" element={<DiscoverPage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/location" element={<LocationPage />} />
              <Route path="/chats" element={<ChatsPage />} />
              <Route path="/chats/:userId" element={<ChatDetailPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
