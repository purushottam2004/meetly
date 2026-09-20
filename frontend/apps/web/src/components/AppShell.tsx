import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { IconChat, IconProfile } from '../lib/icons'
import { countUnreadChats, subscribeToUnreadChanges } from '../lib/messages'
import {
  ensureDisplayNameFromAuth,
  fetchMyProfile,
  requestBrowserLocation,
  saveMyLocation,
  touchLastActive,
} from '../lib/profiles'

/**
 * Persistent header + scroll viewport shared by every screen, matching the
 * prototype's always-mounted `#mainHeader` / `.screen-viewport`. Auth gating
 * for /profile and /chats is handled by ProtectedRoute, not here.
 */
export function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [rawUnreadCount, setRawUnreadCount] = useState(0)
  const [rawAvatarUrl, setRawAvatarUrl] = useState<string | null>(null)
  const unreadCount = user ? rawUnreadCount : 0
  const avatarUrl = user ? rawAvatarUrl : null

  useEffect(() => {
    if (!user) return
    void touchLastActive(user.id)
    void ensureDisplayNameFromAuth(user.id, user.user_metadata)
  }, [user])

  // Re-read on navigation so a freshly uploaded photo shows up as soon as the
  // user leaves the profile screen.
  useEffect(() => {
    if (!user) return
    void fetchMyProfile(user.id).then((profile) => setRawAvatarUrl(profile?.avatar_url ?? null))
  }, [user, location.pathname])

  useEffect(() => {
    if (!user) return
    const refresh = () => void countUnreadChats(user.id).then(setRawUnreadCount)
    refresh()
    return subscribeToUnreadChanges(user.id, refresh)
  }, [user])

  // Ask for location right after sign-in (the browser only prompts once per
  // origin; later visits refresh the coordinates silently). Manual picker is
  // the fallback for users who deny and have no location saved yet.
  useEffect(() => {
    if (!user) return
    let cancelled = false

    void fetchMyProfile(user.id).then(async (profile) => {
      if (cancelled) return
      try {
        const position = await requestBrowserLocation()
        if (cancelled) return
        await saveMyLocation(user.id, {
          location_text: profile?.location_text ?? 'Current location',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
      } catch {
        if (!cancelled && profile && profile.latitude == null) {
          navigate('/location', { state: { from: location } })
        }
      }
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  function goTo(path: string) {
    if (!user) {
      navigate('/login', { state: { from: location } })
      return
    }
    navigate(path)
  }

  return (
    <div className="app">
      <div className="header" id="mainHeader">
        <div
          className="icon-box avatar"
          onClick={() => goTo('/profile')}
          title="Profile & settings"
          style={
            avatarUrl
              ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : undefined
          }
        >
          {!avatarUrl && <IconProfile />}
        </div>
        <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          meetly
        </div>
        <div className="icon-box" onClick={() => goTo('/chats')} title="Chats">
          <IconChat />
          {unreadCount > 0 && (
            <span className="unread-count-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </div>
      </div>

      {!user && (
        <div className="login-nudge" onClick={() => goTo('/profile')}>
          <IconProfile /> Please login &amp; create a profile
        </div>
      )}

      <div className="screen-viewport">
        <Outlet />
      </div>
    </div>
  )
}
