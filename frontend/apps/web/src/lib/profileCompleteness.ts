import type { ProfileItemRow, ProfileRow } from './types'

function filled(value: string | null | undefined): boolean {
  return Boolean(value?.trim())
}

export type ProfileCompletenessCheck = {
  id: string
  label: string
  hint: string
  /** Defaults to 1. Raise this to make a field count more toward the total. */
  weight?: number
  done: (profile: ProfileRow | null, items: ProfileItemRow[]) => boolean
}

/**
 * Profile-completion scoring. Edit this list to change what counts.
 * Percent = (sum of weights of passing checks) / (sum of all weights).
 */
export const PROFILE_COMPLETENESS_CHECKS: ProfileCompletenessCheck[] = [
  {
    id: 'public',
    label: 'Public',
    hint: 'Turn Public on so people can find you and message you.',
    done: (profile) => Boolean(profile?.is_active),
  },
  // A letter in the icon is only a fallback — it is not a profile photo.
  {
    id: 'avatar',
    label: 'Profile photo',
    hint: 'Add a photo so people recognize you.',
    done: (profile) => filled(profile?.avatar_url),
  },
  {
    id: 'name',
    label: 'Display name',
    hint: 'Add the name you want people to see.',
    done: (profile) => filled(profile?.display_name),
  },
  {
    id: 'age',
    label: 'Age',
    hint: 'Add your age.',
    done: (profile) => profile?.age != null && profile.age > 0,
  },
  {
    id: 'headline',
    label: 'Role',
    hint: 'Add a role, like CTO @ xyz company.',
    done: (profile) => filled(profile?.headline),
  },
  {
    id: 'location',
    label: 'Location',
    hint: 'Add your location so people nearby can find you.',
    done: (profile) => filled(profile?.location_text) && profile?.latitude != null,
  },
  {
    id: 'photo',
    label: 'At least one extra photo',
    hint: 'Add another photo to your profile.',
    done: (_profile, items) => items.some((item) => item.kind === 'photo' && filled(item.photo_url)),
  },
  {
    id: 'text',
    label: 'At least one text block',
    hint: 'Add a short note about you.',
    done: (_profile, items) => items.some((item) => item.kind === 'text' && filled(item.body)),
  },
  {
    id: 'social',
    label: 'One social link',
    hint: 'Add a social link so people can find you elsewhere.',
    done: (profile) =>
      filled(profile?.linkedin_url) || filled(profile?.instagram_url) || filled(profile?.twitter_url),
  },
]

const HIGH_VALUE_HINT_IDS = new Set(['avatar', 'headline', 'text', 'social'])

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

function missingChecks(profile: ProfileRow | null, items: ProfileItemRow[]): ProfileCompletenessCheck[] {
  return PROFILE_COMPLETENESS_CHECKS.filter((check) => !check.done(profile, items))
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

/**
 * One line for the profile page. Public is always first when off; otherwise
 * a random high-value gap, then any remaining completeness gap.
 */
export function pickProfileHint(
  profile: ProfileRow | null,
  items: ProfileItemRow[],
): ProfileCompletenessCheck | null {
  const missing = missingChecks(profile, items)
  if (missing.length === 0) return null
  const pub = missing.find((check) => check.id === 'public')
  if (pub) return pub
  const highValue = missing.filter((check) => HIGH_VALUE_HINT_IDS.has(check.id))
  if (highValue.length > 0) return pickRandom(highValue)
  return pickRandom(missing)
}
