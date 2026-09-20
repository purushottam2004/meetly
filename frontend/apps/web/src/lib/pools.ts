import { supabase } from './supabaseClient'
import type { MyPool, PoolMembershipRow, PoolRow, ProfileRow } from './types'

export const MAX_CUSTOM_POOLS = 3

export async function fetchMyPools(userId: string): Promise<MyPool[]> {
  const { data: memberships, error: membershipError } = await supabase
    .from('pool_memberships')
    .select('*')
    .eq('user_id', userId)
  if (membershipError) throw membershipError

  const rows = (memberships ?? []) as PoolMembershipRow[]
  if (rows.length === 0) return []

  const { data: pools, error: poolError } = await supabase.from('pools').select('*')
  if (poolError) throw poolError

  const byId = new Map(((pools ?? []) as PoolRow[]).map((pool) => [pool.id, pool]))
  return rows
    .map((membership) => {
      const pool = byId.get(membership.pool_id)
      if (!pool) return null
      return { ...pool, visible: membership.visible }
    })
    .filter((row): row is MyPool => row != null)
}

export type PoolNameCheck = {
  available: boolean
  suggestions: string[]
}

export async function checkPoolName(name: string): Promise<PoolNameCheck> {
  const { data, error } = await supabase.rpc('check_pool_name', { p_name: name })
  if (error) throw error
  const payload = data as { available?: boolean; suggestions?: string[] } | null
  return {
    available: payload?.available === true,
    suggestions: payload?.suggestions ?? [],
  }
}

export async function createPool(name: string): Promise<PoolRow> {
  const { data, error } = await supabase.rpc('create_pool', { p_name: name })
  if (error) throw error
  return data as PoolRow
}

export async function joinPool(code: string): Promise<PoolRow> {
  const { data, error } = await supabase.rpc('join_pool', { p_code: code })
  if (error) throw error
  return data as PoolRow
}

export async function setPoolVisible(userId: string, poolId: string, visible: boolean): Promise<void> {
  const { error } = await supabase
    .from('pool_memberships')
    .update({ visible })
    .eq('user_id', userId)
    .eq('pool_id', poolId)
  if (error) throw error
}

export async function setEveryoneVisible(userId: string, visible: boolean): Promise<void> {
  const { error } = await supabase.from('users').update({ visible_in_everyone: visible }).eq('id', userId)
  if (error) throw error
}

export function createdPoolCount(userId: string, pools: MyPool[]): number {
  return pools.filter((pool) => pool.created_by === userId).length
}

export type DiscoverPoolFilter = {
  includeEveryone: boolean
  poolIds: string[]
}

export async function fetchDiscoverProfilesFiltered(
  currentUserId: string | null,
  filter: DiscoverPoolFilter,
): Promise<ProfileRow[]> {
  const { data, error } = await supabase.rpc('discover_profiles', {
    viewer_id: currentUserId,
    include_everyone: filter.includeEveryone,
    pool_ids: filter.poolIds,
  })
  if (error) throw error
  return data ?? []
}

export type SharedPool = Pick<PoolRow, 'id' | 'name'>

export async function fetchSharedPools(otherUserId: string): Promise<SharedPool[]> {
  const { data, error } = await supabase.rpc('shared_pools', { p_other_id: otherUserId })
  if (error) throw error
  return (data ?? []) as SharedPool[]
}
