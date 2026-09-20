export type DiscoverGroupFilterChoice = {
  includeEveryone: boolean
  poolIds: string[]
}

export const DEFAULT_DISCOVER_GROUP_FILTERS: DiscoverGroupFilterChoice = {
  includeEveryone: true,
  poolIds: [],
}

type Listener = () => void

const listeners = new Set<Listener>()
const cache = new Map<string, DiscoverGroupFilterChoice>()

function ownerKey(userId: string | null): string {
  return userId ?? 'anon'
}

function readStored(userId: string | null): DiscoverGroupFilterChoice {
  try {
    const raw = localStorage.getItem(`meetly-discover-group-filters:${ownerKey(userId)}`)
    if (!raw) return { ...DEFAULT_DISCOVER_GROUP_FILTERS, poolIds: [] }
    const parsed = JSON.parse(raw) as Partial<DiscoverGroupFilterChoice>
    return {
      includeEveryone: parsed.includeEveryone !== false,
      poolIds: Array.isArray(parsed.poolIds)
        ? parsed.poolIds.filter((id): id is string => typeof id === 'string')
        : [],
    }
  } catch {
    return { ...DEFAULT_DISCOVER_GROUP_FILTERS, poolIds: [] }
  }
}

function writeStored(userId: string | null, choice: DiscoverGroupFilterChoice): void {
  localStorage.setItem(`meetly-discover-group-filters:${ownerKey(userId)}`, JSON.stringify(choice))
}

export function subscribeDiscoverGroupFilters(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getDiscoverGroupFilters(userId: string | null): DiscoverGroupFilterChoice {
  const key = ownerKey(userId)
  const cached = cache.get(key)
  if (cached) return cached
  const loaded = readStored(userId)
  cache.set(key, loaded)
  return loaded
}

export function setDiscoverGroupFilters(
  userId: string | null,
  choice: DiscoverGroupFilterChoice,
): void {
  cache.set(ownerKey(userId), choice)
  writeStored(userId, choice)
  listeners.forEach((listener) => listener())
}

export function toggleDiscoverEveryone(userId: string | null): void {
  const current = getDiscoverGroupFilters(userId)
  setDiscoverGroupFilters(userId, {
    ...current,
    includeEveryone: !current.includeEveryone,
  })
}

export function toggleDiscoverPool(userId: string | null, poolId: string): void {
  const current = getDiscoverGroupFilters(userId)
  const poolIds = current.poolIds.includes(poolId)
    ? current.poolIds.filter((id) => id !== poolId)
    : [...current.poolIds, poolId]
  setDiscoverGroupFilters(userId, { ...current, poolIds })
}
