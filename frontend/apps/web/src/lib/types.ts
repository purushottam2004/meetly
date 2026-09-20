export type ProfileRow = {
  id: string
  username: string | null
  display_name: string | null
  age: number | null
  headline: string | null
  avatar_url: string | null
  location_text: string | null
  latitude: number | null
  longitude: number | null
  linkedin_url: string | null
  instagram_url: string | null
  twitter_url: string | null
  last_active_at: string
  is_active: boolean
  /** Set when the user leaves the first-run basics screen via Continue. */
  basics_completed_at: string | null
  open_to_chat: boolean
  visible_in_everyone: boolean
  created_at: string
  updated_at: string
}

export type PoolRow = {
  id: string
  name: string
  join_code: string
  created_by: string
  created_at: string
}

export type PoolMembershipRow = {
  user_id: string
  pool_id: string
  visible: boolean
  created_at: string
}

export type MyPool = PoolRow & { visible: boolean }

export type ProfileItemKind = 'photo' | 'text'

export type ProfileItemRow = {
  id: string
  user_id: string
  kind: ProfileItemKind
  body: string | null
  photo_url: string | null
  position: number
  created_at: string
  updated_at: string
}

export type PushSubscriptionRow = {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  created_at: string
  updated_at: string
}

export type MessageRow = {
  id: string
  sender_id: string
  recipient_id: string
  body: string
  quote_kind: ProfileItemKind | null
  quote_text: string | null
  is_seen: boolean
  created_at: string
}

export type SwipeDirection = 'left' | 'right'

export type SwipeRow = {
  id: string
  swiper_id: string
  swiped_id: string
  direction: SwipeDirection
  created_at: string
}

export type UserBlockRow = {
  blocker_id: string
  blocked_id: string
  created_at: string
}

export type Quote = {
  kind: ProfileItemKind
  text: string
}

export type LatLng = { lat: number; lng: number }
