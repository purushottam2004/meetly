import { compressImage, PROFILE_PHOTO_COMPRESS } from './compressImage'
import { supabase } from './supabaseClient'
import type { ProfileItemKind, ProfileItemRow, ProfileRow, SwipeDirection } from './types'

export type ProfilePhotoKind = keyof typeof PROFILE_PHOTO_COMPRESS

export async function fetchMyProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return data
}

/** Google (and other OAuth) name fields GoTrue stores on the auth user. */
export function displayNameFromAuthMetadata(metadata: object | null | undefined): string | null {
  if (!metadata) return null
  const record = metadata as Record<string, unknown>
  for (const key of ['full_name', 'name', 'given_name'] as const) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

/**
 * First-time only: if the profile still has no display name, copy it from
 * the Google account. Later visits and a name the user typed themselves
 * are left alone.
 */
export async function ensureDisplayNameFromAuth(
  userId: string,
  metadata: object | null | undefined,
): Promise<void> {
  const profile = await fetchMyProfile(userId)
  if (profile?.display_name?.trim()) return
  const name = displayNameFromAuthMetadata(metadata)
  if (!name) return
  await saveMyProfileHeader(userId, { display_name: name })
}

/**
 * Randomized, staged discovery feed: nearest + most recently active first,
 * widening the radius/recency window one tier at a time (see
 * public.discover_profiles() / DISCOVER_TIERS) until a tier has at least one
 * not-yet-passed person. People you've already messaged stay in the feed;
 * only a pass removes someone. Anonymous visitors (currentUserId null) and
 * viewers without a saved location fall straight through to everyone.
 */
export async function fetchDiscoverProfiles(currentUserId: string | null): Promise<ProfileRow[]> {
  const { data, error } = await supabase.rpc('discover_profiles', { viewer_id: currentUserId })
  if (error) throw error
  return data ?? []
}

/** Marks the signed-in user as active now; call once per visit/session. */
export async function touchLastActive(userId: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', userId)
  if (error) throw error
}

export async function fetchProfileItems(userId: string): Promise<ProfileItemRow[]> {
  const { data, error } = await supabase
    .from('profile_items')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true })
  if (error) throw error
  return data ?? []
}

export type ProfileHeaderFields = Partial<
  Pick<
    ProfileRow,
    'display_name' | 'headline' | 'age' | 'linkedin_url' | 'instagram_url' | 'twitter_url'
  >
>

export async function saveMyProfileHeader(userId: string, fields: ProfileHeaderFields): Promise<void> {
  const { error } = await supabase.from('users').update(fields).eq('id', userId)
  if (error) throw error
}

/** "Activate Profile" toggle — off by default; only active profiles show up in Discover. */
export async function saveMyActiveState(userId: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('users').update({ is_active: isActive }).eq('id', userId)
  if (error) throw error
}

/** Triggers the browser's native location permission prompt (silent once granted). */
export function requestBrowserLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not available in this browser'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject)
  })
}

export async function saveMyLocation(
  userId: string,
  fields: { location_text: string; latitude: number; longitude: number },
): Promise<void> {
  const { error } = await supabase.from('users').update(fields).eq('id', userId)
  if (error) throw error
}

/** Compresses in the browser, then stores under `{userId}/{uuid}.{ext}` in the public `profile-photos` bucket. */
export async function uploadProfilePhoto(
  userId: string,
  file: File,
  kind: ProfilePhotoKind = 'gallery',
): Promise<string> {
  const compressed = await compressImage(file, PROFILE_PHOTO_COMPRESS[kind])
  const ext = compressed.type === 'image/jpeg' ? 'jpg' : compressed.name.split('.').pop() || 'jpg'
  const path = `${userId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from('profile-photos')
    .upload(path, compressed, { contentType: compressed.type || undefined })
  if (error) throw error
  return supabase.storage.from('profile-photos').getPublicUrl(path).data.publicUrl
}

export async function saveMyAvatar(userId: string, avatarUrl: string): Promise<void> {
  const { error } = await supabase.from('users').update({ avatar_url: avatarUrl }).eq('id', userId)
  if (error) throw error
}

export async function addProfileItem(
  userId: string,
  kind: ProfileItemKind,
  position: number,
  fields: { body?: string; photo_url?: string } = {},
): Promise<ProfileItemRow> {
  const { data, error } = await supabase
    .from('profile_items')
    .insert({ user_id: userId, kind, position, ...fields })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateProfileItem(
  itemId: string,
  fields: Partial<Pick<ProfileItemRow, 'body' | 'photo_url' | 'position'>>,
): Promise<void> {
  const { error } = await supabase.from('profile_items').update(fields).eq('id', itemId)
  if (error) throw error
}

export async function deleteProfileItem(itemId: string): Promise<void> {
  const { error } = await supabase.from('profile_items').delete().eq('id', itemId)
  if (error) throw error
}

export async function reorderProfileItems(items: { id: string; position: number }[]): Promise<void> {
  await Promise.all(items.map((item) => updateProfileItem(item.id, { position: item.position })))
}

export async function recordSwipe(
  swiperId: string,
  swipedId: string,
  direction: SwipeDirection,
): Promise<void> {
  const { error } = await supabase
    .from('swipes')
    .upsert({ swiper_id: swiperId, swiped_id: swipedId, direction }, { onConflict: 'swiper_id,swiped_id' })
  if (error) throw error
}

/** Powers the Discover empty-state "check back later" reset: re-surfaces people you passed on. */
export async function clearMyPassedSwipes(swiperId: string): Promise<void> {
  const { error } = await supabase
    .from('swipes')
    .delete()
    .eq('swiper_id', swiperId)
    .eq('direction', 'left')
  if (error) throw error
}
