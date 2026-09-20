import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { ComposeOverlay } from '../components/ComposeOverlay'
import { ProfileCard } from '../components/ProfileCard'
import { IconChat, IconRefresh, IconUsers, IconX } from '../lib/icons'
import { sendMessage } from '../lib/messages'
import { fetchDiscoverProfilesFiltered, fetchMyPools, fetchSharedPools, type SharedPool } from '../lib/pools'
import {
  applyDiscoverSwipe,
  rankDiscoverProfiles,
  ranksFromSwipes,
  type DiscoverSwipeRanks,
} from '../lib/discoverRank'
import {
  clearMyPassedSwipes,
  fetchMyProfile,
  fetchMySwipes,
  fetchProfileItems,
  recordSwipe,
} from '../lib/profiles'
import type { LatLng, MyPool, ProfileItemRow, ProfileRow, Quote, SwipeDirection } from '../lib/types'
import type { PendingCompose } from '../lib/authFlow'

type ComposeState = { profile: ProfileRow; quote: Quote | null }
type LocationState = { openComposeFor?: PendingCompose } | null

export function DiscoverPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const routerLocation = useLocation()

  const [queue, setQueue] = useState<ProfileRow[] | null>(null)
  const [items, setItems] = useState<ProfileItemRow[]>([])
  const [cardMotion, setCardMotion] = useState<'in' | 'out' | null>(null)
  const [sharedForId, setSharedForId] = useState<{ id: string; pools: SharedPool[] } | null>(null)
  const advancingRef = useRef(false)
  const [fetchedLocation, setFetchedLocation] = useState<LatLng | null>(null)
  const [compose, setCompose] = useState<ComposeState | null>(null)
  const [myPools, setMyPools] = useState<MyPool[]>([])
  const [includeEveryone, setIncludeEveryone] = useState(true)
  const [selectedPoolIds, setSelectedPoolIds] = useState<string[]>([])
  const [swipeById, setSwipeById] = useState<DiscoverSwipeRanks>({})
  const swipeByIdRef = useRef(swipeById)

  useEffect(() => {
    swipeByIdRef.current = swipeById
  }, [swipeById])

  // Only ever set from the fetch below; derive the "no user" case at render
  // time instead of resetting it from an effect.
  const myLocation = user ? fetchedLocation : null

  async function loadQueue() {
    const profiles = await fetchDiscoverProfilesFiltered(user?.id ?? null, {
      includeEveryone,
      poolIds: selectedPoolIds,
    })
    const ranks = user ? ranksFromSwipes(await fetchMySwipes(user.id)) : swipeByIdRef.current
    setSwipeById(ranks)
    setQueue(rankDiscoverProfiles(profiles, ranks))
    return profiles
  }

  useEffect(() => {
    if (!user) return
    void fetchMyPools(user.id).then(setMyPools)
  }, [user, routerLocation.pathname])

  // Wait for the session to settle: fetching while auth is still loading sends
  // viewer_id = null, and an anonymous feed has no one to exclude — so you'd
  // get your own card back.
  useEffect(() => {
    if (loading) return
    void loadQueue()
    // loadQueue reads the latest filter/auth values; listing those as deps is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user?.id, includeEveryone, selectedPoolIds])

  useEffect(() => {
    if (!user) return
    void fetchMyProfile(user.id).then((profile) => {
      if (profile?.latitude != null && profile.longitude != null) {
        setFetchedLocation({ lat: profile.latitude, lng: profile.longitude })
      }
    })
  }, [user])

  const top = queue?.[0] ?? null
  const sharedPools = top && user && sharedForId?.id === top.id ? sharedForId.pools : []

  useEffect(() => {
    if (!top) return
    void fetchProfileItems(top.id).then(setItems)
    if (!user) return
    const profileId = top.id
    void fetchSharedPools(profileId)
      .then((pools) => setSharedForId({ id: profileId, pools }))
      .catch(() => setSharedForId({ id: profileId, pools: [] }))
  }, [top, user])

  // Resume a message that was interrupted by a login redirect.
  useEffect(() => {
    const state = routerLocation.state as LocationState
    const pending = state?.openComposeFor
    if (!pending || !user || !queue) return

    const target = queue.find((profile) => profile.id === pending.profileId)
    navigate(routerLocation.pathname, { replace: true, state: null })
    if (target) {
      void Promise.resolve().then(() => setCompose({ profile: target, quote: pending.quote ?? null }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, user])

  function requireLoginThen(pendingCompose: PendingCompose) {
    navigate('/login', { state: { from: { pathname: '/' }, pendingCompose } })
  }

  function demote(profileId: string, direction: SwipeDirection) {
    const next = applyDiscoverSwipe(queue ?? [], swipeByIdRef.current, profileId, direction)
    setSwipeById(next.ranks)
    setQueue(next.profiles)
  }

  function advance(profileId: string, direction: SwipeDirection, persist: boolean) {
    if (advancingRef.current) return
    advancingRef.current = true
    setCardMotion('out')
    if (persist && user) void recordSwipe(user.id, profileId, direction).catch(console.error)
    window.setTimeout(() => {
      demote(profileId, direction)
      setCardMotion('in')
      window.setTimeout(() => {
        setCardMotion(null)
        advancingRef.current = false
      }, 240)
    }, 180)
  }

  function skip() {
    if (!top) return
    advance(top.id, 'left', Boolean(user))
  }

  function openCompose() {
    if (!top) return
    if (!user) {
      requireLoginThen({ profileId: top.id })
      return
    }
    setCompose({ profile: top, quote: null })
  }

  function commentOnItem(quote: Quote) {
    if (!top) return
    if (!user) {
      requireLoginThen({ profileId: top.id, quote })
      return
    }
    setCompose({ profile: top, quote })
  }

  async function handleSend(text: string) {
    if (!user || !compose) return
    await sendMessage(user.id, compose.profile.id, text, compose.quote)
    await recordSwipe(user.id, compose.profile.id, 'right')
    const profileId = compose.profile.id
    setCompose(null)
    advance(profileId, 'right', false)
  }

  async function resetPassed() {
    if (user) {
      await clearMyPassedSwipes(user.id).catch(console.error)
    } else {
      const next = { ...swipeByIdRef.current }
      for (const id of Object.keys(next)) {
        if (next[id] === 'left') delete next[id]
      }
      swipeByIdRef.current = next
      setSwipeById(next)
    }
    await loadQueue()
  }

  function togglePoolChip(poolId: string) {
    setSelectedPoolIds((current) =>
      current.includes(poolId) ? current.filter((id) => id !== poolId) : [...current, poolId],
    )
  }

  const filterBar = (
    <div className="discover-filters" role="tablist" aria-label="Pool filters">
      <button
        type="button"
        className={`discover-filter-chip ${includeEveryone ? 'on' : ''}`}
        onClick={() => setIncludeEveryone((value) => !value)}
      >
        Everyone
      </button>
      {(user ? myPools : []).map((pool) => (
        <button
          type="button"
          key={pool.id}
          className={`discover-filter-chip ${selectedPoolIds.includes(pool.id) ? 'on' : ''}`}
          onClick={() => togglePoolChip(pool.id)}
        >
          {pool.name}
        </button>
      ))}
    </div>
  )

  if (queue === null) {
    return (
      <div className="screen active" id="screen-discover">
        {filterBar}
        <p style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>Loading…</p>
      </div>
    )
  }

  return (
    <div className="screen active" id="screen-discover">
      {filterBar}
      {!top && (
        <div className="empty-state show">
          <div className="circle">
            <IconUsers />
          </div>
          <div>
            <strong>That's everyone for now</strong>
            <br />
            Check back later for more people to meet.
          </div>
          <div className="action-btn small" onClick={() => void resetPassed()} style={{ marginTop: 6 }}>
            <IconRefresh />
          </div>
        </div>
      )}

      {top && (
        <div id="cardSlot">
          <div
            key={top.id}
            className={`card ${cardMotion === 'out' ? 'advance-out' : ''} ${cardMotion === 'in' ? 'advance-in' : ''}`}
          >
            <ProfileCard
              profile={top}
              items={items}
              myLocation={myLocation}
              sharedPools={sharedPools}
              onComment={commentOnItem}
            />
          </div>
        </div>
      )}

      {top && (
        <div className="floating-actions">
          <div className="float-btn pass" role="button" aria-label="Skip" onClick={skip}>
            <IconX />
          </div>
          <div className="float-btn message" onClick={openCompose}>
            <IconChat />
          </div>
        </div>
      )}

      {compose && (
        <ComposeOverlay
          profile={compose.profile}
          quote={compose.quote}
          onClearQuote={() => setCompose((c) => (c ? { ...c, quote: null } : c))}
          onCancel={() => setCompose(null)}
          onSend={handleSend}
        />
      )}
    </div>
  )
}
