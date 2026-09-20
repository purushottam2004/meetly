import type { ProfileItemRow, ProfileRow } from './types'

function filled(value: string | null | undefined): boolean {
  return Boolean(value?.trim())
}

export type ProfileCompletenessCheck = {
  id: string
  /** Shown in comments / future UI; not rendered yet. */
  label: string
  /** Defaults to 1. Raise this to make a field count more toward the total. */
  weight?: number
  done: (profile: ProfileRow | null, items: ProfileItemRow[]) => boolean
}

/**
 * Profile-completion scoring. Edit this list to change what counts.
 * Percent = (sum of weights of passing checks) / (sum of all weights).
 */
export const PROFILE_COMPLETENESS_CHECKS: ProfileCompletenessCheck[] = [
  // A letter in the icon is only a fallback — it is not a profile photo.
  { id: 'avatar', label: 'Profile photo', done: (profile) => filled(profile?.avatar_url) },
  { id: 'name', label: 'Display name', done: (profile) => filled(profile?.display_name) },
  { id: 'age', label: 'Age', done: (profile) => profile?.age != null && profile.age > 0 },
  { id: 'headline', label: 'Headline', done: (profile) => filled(profile?.headline) },
  {
    id: 'location',
    label: 'Location',
    done: (profile) => filled(profile?.location_text) && profile?.latitude != null,
  },
  {
    id: 'photo',
    label: 'At least one extra photo',
    done: (_profile, items) => items.some((item) => item.kind === 'photo' && filled(item.photo_url)),
  },
  {
    id: 'text',
    label: 'At least one text block',
    done: (_profile, items) => items.some((item) => item.kind === 'text' && filled(item.body)),
  },
  {
    id: 'social',
    label: 'One social link',
    done: (profile) =>
      filled(profile?.linkedin_url) || filled(profile?.instagram_url) || filled(profile?.twitter_url),
  },
]

export function profileCompletenessPercent(
  profile: ProfileRow | null,
  items: ProfileItemRow[],
): number {
  const total = PROFILE_COMPLETENESS_CHECKS.reduce((sum, check) => sum + (check.weight ?? 1), 0)
  if (total === 0) return 0
  const earned = PROFILE_COMPLETENESS_CHECKS.reduce(
    (sum, check) => sum + (check.done(profile, items) ? (check.weight ?? 1) : 0),
    0,
  )
  return Math.round((earned / total) * 100)
}
