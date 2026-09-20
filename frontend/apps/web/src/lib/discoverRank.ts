import type { ProfileRow, SwipeDirection, SwipeRow } from './types'

export type DiscoverSwipeRanks = Record<string, SwipeDirection>

export function ranksFromSwipes(swipes: SwipeRow[]): DiscoverSwipeRanks {
  return Object.fromEntries(swipes.map((swipe) => [swipe.swiped_id, swipe.direction]))
}

/** Untouched first, then chosen (right), then rejected (left). Order inside a bucket is kept. */
export function rankDiscoverProfiles(
  profiles: ProfileRow[],
  ranks: DiscoverSwipeRanks,
): ProfileRow[] {
  const untouched: ProfileRow[] = []
  const chosen: ProfileRow[] = []
  const rejected: ProfileRow[] = []
  for (const profile of profiles) {
    const direction = ranks[profile.id]
    if (direction === 'left') rejected.push(profile)
    else if (direction === 'right') chosen.push(profile)
    else untouched.push(profile)
  }
  return [...untouched, ...chosen, ...rejected]
}

/** Record an action, then put that person at the end of their new bucket. */
export function applyDiscoverSwipe(
  profiles: ProfileRow[],
  ranks: DiscoverSwipeRanks,
  profileId: string,
  direction: SwipeDirection,
): { profiles: ProfileRow[]; ranks: DiscoverSwipeRanks } {
  const nextRanks = { ...ranks, [profileId]: direction }
  const target = profiles.find((profile) => profile.id === profileId)
  if (!target) {
    return { profiles: rankDiscoverProfiles(profiles, nextRanks), ranks: nextRanks }
  }
  const rest = profiles.filter((profile) => profile.id !== profileId)
  return {
    profiles: rankDiscoverProfiles([...rest, target], nextRanks),
    ranks: nextRanks,
  }
}
