import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { ProfileCard } from '../components/ProfileCard'
import { IconArrowLeft } from '../lib/icons'
import { fetchSharedPools, type SharedPool } from '../lib/pools'
import { fetchMyProfile, fetchProfileItems } from '../lib/profiles'
import type { LatLng, ProfileItemRow, ProfileRow } from '../lib/types'

export function UserProfilePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { userId } = useParams<{ userId: string }>()

  const [profile, setProfile] = useState<ProfileRow | null | undefined>(undefined)
  const [items, setItems] = useState<ProfileItemRow[]>([])
  const [myLocation, setMyLocation] = useState<LatLng | null>(null)
  const [sharedForId, setSharedForId] = useState<{ id: string; pools: SharedPool[] } | null>(null)

  useEffect(() => {
    if (!userId) return
    void fetchMyProfile(userId).then(setProfile)
    void fetchProfileItems(userId).then(setItems)
  }, [userId])

  useEffect(() => {
    if (!user || !userId || userId === user.id) return
    const profileId = userId
    void fetchSharedPools(profileId)
      .then((pools) => setSharedForId({ id: profileId, pools }))
      .catch(() => setSharedForId({ id: profileId, pools: [] }))
  }, [user, userId])

  useEffect(() => {
    if (!user) return
    void fetchMyProfile(user.id).then((mine) => {
      if (mine?.latitude != null && mine.longitude != null) {
        setMyLocation({ lat: mine.latitude, lng: mine.longitude })
      }
    })
  }, [user])

  const sharedPools = user && userId && userId !== user.id && sharedForId?.id === userId ? sharedForId.pools : []

  if (user && userId === user.id) {
    return <Navigate to="/profile" replace />
  }

  if (profile === undefined) {
    return <p style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>Loading…</p>
  }

  if (!profile) {
    return (
      <div className="screen active" id="screen-user-profile">
        <div className="back-row" onClick={() => navigate(userId ? `/chats/${userId}` : '/chats')}>
          <IconArrowLeft /> Back to chat
        </div>
        <p style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>This profile is not available.</p>
      </div>
    )
  }

  return (
    <div className="screen active" id="screen-user-profile">
      <div className="back-row" onClick={() => navigate(`/chats/${profile.id}`)}>
        <IconArrowLeft /> Back to chat
      </div>
      <div className="card">
        <ProfileCard profile={profile} items={items} myLocation={myLocation} sharedPools={sharedPools} />
      </div>
    </div>
  )
}
