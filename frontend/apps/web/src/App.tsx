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
import { UserProfilePage } from './pages/UserProfilePage'
import { BasicsPage } from './pages/BasicsPage'

/**
 * Discover is public (matches the prototype's browsable swipe deck); signing
 * in is only required for messaging, chats, profile editing, location, and
 * the first-run basics screen.
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
              <Route path="/basics" element={<BasicsPage />} />
              <Route path="/chats" element={<ChatsPage />} />
              <Route path="/chats/:userId" element={<ChatDetailPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/profile/:userId" element={<UserProfilePage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
