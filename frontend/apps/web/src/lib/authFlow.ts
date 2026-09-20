import type { NavigateFunction } from 'react-router-dom'
import type { ProfileRow, Quote } from './types'

export type PendingCompose = { profileId: string; quote?: Quote | null }

export type AuthFlowState = {
  from?: { pathname?: string }
  pendingCompose?: PendingCompose
  openComposeFor?: PendingCompose
} | null

export const ONBOARDING_PATHS = new Set(['/location', '/basics'])

export function hasSavedLocation(profile: ProfileRow | null): boolean {
  return profile?.latitude != null && profile?.longitude != null
}

export function needsBasics(profile: ProfileRow | null): boolean {
  return !profile?.basics_completed_at
}

function pendingFromState(state: AuthFlowState): PendingCompose | undefined {
  return state?.pendingCompose ?? state?.openComposeFor
}

function resumePath(state: AuthFlowState): string {
  const path = state?.from?.pathname
  if (!path || path === '/login' || ONBOARDING_PATHS.has(path)) return '/'
  return path
}

/** Continues wherever sign-in (and location / basics) was triggered from. */
export function resumeAfterAuth(navigate: NavigateFunction, state: AuthFlowState) {
  const pending = pendingFromState(state)
  if (pending) {
    navigate('/', { replace: true, state: { openComposeFor: pending } })
    return
  }
  navigate(resumePath(state), { replace: true })
}

/** Sends an authenticated user to the next unfinished setup step, if any. */
export function redirectToOnboarding(
  navigate: NavigateFunction,
  profile: ProfileRow | null,
  state: AuthFlowState,
  currentPath: string,
): boolean {
  if (ONBOARDING_PATHS.has(currentPath)) return false
  if (!hasSavedLocation(profile)) {
    navigate('/location', { replace: true, state: state ?? undefined })
    return true
  }
  if (needsBasics(profile)) {
    navigate('/basics', { replace: true, state: state ?? undefined })
    return true
  }
  return false
}
