import { supabase } from './supabaseClient'
import type { UserBlockRow } from './types'

export const REPORT_REASONS = [
  'Harassment',
  'Spam',
  'Fake or misleading',
  'Inappropriate',
  'Other',
] as const

export type ReportReason = (typeof REPORT_REASONS)[number]

/** People hidden from this user because either side blocked the other. */
export async function fetchHiddenUserIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocker_id, blocked_id')
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`)
  if (error) throw error
  const ids = new Set<string>()
  for (const row of (data ?? []) as Pick<UserBlockRow, 'blocker_id' | 'blocked_id'>[]) {
    ids.add(row.blocker_id === userId ? row.blocked_id : row.blocker_id)
  }
  return ids
}

export async function fetchIBlockedUser(userId: string, otherUserId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocker_id')
    .eq('blocker_id', userId)
    .eq('blocked_id', otherUserId)
    .maybeSingle()
  if (error) throw error
  return data != null
}

export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  const { error } = await supabase.from('user_blocks').upsert(
    { blocker_id: blockerId, blocked_id: blockedId },
    { onConflict: 'blocker_id,blocked_id' },
  )
  if (error) throw error
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  const { error } = await supabase
    .from('user_blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId)
  if (error) throw error
}

export async function reportUser(
  reporterId: string,
  reportedId: string,
  reason: ReportReason,
  details?: string,
): Promise<void> {
  const { error } = await supabase.from('user_reports').insert({
    reporter_id: reporterId,
    reported_id: reportedId,
    reason,
    details: details?.trim() || null,
  })
  if (error) throw error
}
