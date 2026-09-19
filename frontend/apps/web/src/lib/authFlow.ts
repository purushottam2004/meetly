import type { NavigateFunction } from 'react-router-dom'
import type { Quote } from './types'

export type PendingCompose = { profileId: string; quote?: Quote | null }

export type AuthFlowState = {
  from?: { pathname?: string }
  pendingCompose?: PendingCompose
} | null

/** Continues wherever sign-in (and, if needed, the location step) was triggered from. */
export function resumeAfterAuth(navigate: NavigateFunction, state: AuthFlowState) {
  if (state?.pendingCompose) {
    navigate('/', { replace: true, state: { openComposeFor: state.pendingCompose } })
    return
  }
  navigate(state?.from?.pathname ?? '/', { replace: true })
}
