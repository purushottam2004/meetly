import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { IconChat, IconProfile } from '../lib/icons'
import { touchLastActive } from '../lib/profiles'

/**
 * Persistent header + scroll viewport shared by every screen, matching the
 * prototype's always-mounted `#mainHeader` / `.screen-viewport`. Auth gating
 * for /profile and /chats is handled by ProtectedRoute, not here.
 */
export function AppShell() {
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    void touchLastActive(user.id)
  }, [user])

  return (
    <div className="app">
      <div className="header" id="mainHeader">
        <div
          className="icon-box avatar"
          onClick={() => navigate('/profile')}
          title="Profile & settings"
        >
          <IconProfile />
        </div>
        <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          meetly
        </div>
        <div className="icon-box" onClick={() => navigate('/chats')} title="Chats">
          <IconChat />
        </div>
      </div>

      <div className="screen-viewport">
        <Outlet />
      </div>
    </div>
  )
}
