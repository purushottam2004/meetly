import { useEffect, useState, type CSSProperties } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { IconChat, IconProfile } from '../lib/icons'
import { profileAvatarInitial } from '../lib/avatarInitial'
import { countUnreadChats, subscribeToUnreadChanges } from '../lib/messages'
import { profileCompletenessPercent } from '../lib/profileCompleteness'
import {
  ensureDisplayNameFromAuth,
  fetchMyProfile,
  fetchProfileItems,
  requestBrowserLocation,
  saveMyLocation,
  touchLastActive,
} from '../lib/profiles'
import { enableMessagePush } from '../lib/push'

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
  const [rawDisplayName, setRawDisplayName] = useState<string | null>(null)
  const [completionPct, setCompletionPct] = useState(0)
  const unreadCount = user ? rawUnreadCount : 0
  const avatarUrl = user ? rawAvatarUrl : null
  const avatarInitial = user ? profileAvatarInitial(rawDisplayName) : ''
  const ringPct = user ? completionPct : 0

  useEffect(() => {
    if (!user) return
    void touchLastActive(user.id)
    void ensureDisplayNameFromAuth(user.id, user.user_metadata)
    void enableMessagePush()
  }, [user])

  // Re-read on navigation so a freshly uploaded photo / edited field updates
  // the avatar and the completion ring as soon as the user leaves profile.
  useEffect(() => {
    if (!user) return
    void Promise.all([fetchMyProfile(user.id), fetchProfileItems(user.id)]).then(([profile, items]) => {
      setRawAvatarUrl(profile?.avatar_url ?? null)
      setRawDisplayName(profile?.display_name ?? null)
      setCompletionPct(profileCompletenessPercent(profile, items))
    })
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
        <div className="header-profile" onClick={() => goTo('/profile')}>
          <div
            className="avatar-completeness"
            style={{ '--pct': ringPct } as CSSProperties}
            title={user ? `Profile ${ringPct}% complete` : 'Profile & settings'}
          >
            <div className="avatar-completeness-gap">
              <div
                className="icon-box avatar"
                style={
                  avatarUrl
                    ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                    : undefined
                }
              >
                {avatarUrl ? null : avatarInitial ? (
                  <span className="avatar-initial">{avatarInitial}</span>
                ) : (
                  <IconProfile />
                )}
              </div>
            </div>
            {ringPct < 100 && <span className="avatar-completeness-pct">{ringPct}%</span>}
          </div>
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
