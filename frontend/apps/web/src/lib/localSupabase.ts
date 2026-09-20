import { suggestUnusedPoolNames } from './poolNames'
import type { Session, SupabaseClient, User } from '@supabase/supabase-js'
import type {
  MessageRow,
  PoolMembershipRow,
  PoolRow,
  ProfileItemRow,
  ProfileRow,
  PushSubscriptionRow,
  SwipeRow,
  UserBlockRow,
} from './types'

const SESSION_KEY = 'meetly-local-session'
const DB_KEY = 'meetly-local-db-v3'
const PASSWORD = 'password123'

type AuthAccount = { id: string; email: string; password: string; name: string }

type UserReportRow = {
  id: string
  reporter_id: string
  reported_id: string
  reason: string
  details: string | null
  created_at: string
}

type LocalDb = {
  users: ProfileRow[]
  profile_items: ProfileItemRow[]
  messages: MessageRow[]
  swipes: SwipeRow[]
  pools: PoolRow[]
  pool_memberships: PoolMembershipRow[]
  push_subscriptions: PushSubscriptionRow[]
  user_blocks: UserBlockRow[]
  user_reports: UserReportRow[]
  accounts: AuthAccount[]
}

function isoHoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3600_000).toISOString()
}

function uuid(n: number): string {
  return `00000000-0000-0000-0000-${n.toString().padStart(12, '0')}`
}

function profile(
  n: number,
  fields: Pick<ProfileRow, 'username' | 'display_name' | 'age' | 'headline' | 'location_text'> & {
    latitude: number
    longitude: number
    hoursAgo?: number
    visible_in_everyone?: boolean
    open_to_chat?: boolean
  },
): ProfileRow {
  const now = new Date().toISOString()
  return {
    id: uuid(n),
    username: fields.username,
    display_name: fields.display_name,
    age: fields.age,
    headline: fields.headline,
    avatar_url: null,
    location_text: fields.location_text,
    latitude: fields.latitude,
    longitude: fields.longitude,
    linkedin_url: null,
    instagram_url: null,
    twitter_url: null,
    last_active_at: isoHoursAgo(fields.hoursAgo ?? 0),
    is_active: true,
    basics_completed_at: now,
    open_to_chat: fields.open_to_chat === true,
    visible_in_everyone: fields.visible_in_everyone !== false,
    created_at: now,
    updated_at: now,
  }
}

function defaultDb(): LocalDb {
  const seed = profile(1, {
    username: 'seed_user',
    display_name: 'Seed User',
    age: 27,
    headline: 'Product Designer @ Figma',
    location_text: 'Koramangala, Bengaluru',
    latitude: 12.9352,
    longitude: 77.6245,
  })
  const test = profile(2, {
    username: 'test_user',
    display_name: 'Test User',
    age: 29,
    headline: 'Backend Eng, open to freelance',
    location_text: 'Indiranagar, Bengaluru',
    latitude: 12.9784,
    longitude: 77.6408,
    open_to_chat: true,
  })
  const nearby = profile(3, {
    username: 'priya',
    display_name: 'Priya Nair',
    age: 26,
    headline: 'PM at a climate startup',
    location_text: 'HSR Layout, Bengaluru',
    latitude: 12.9121,
    longitude: 77.6446,
    hoursAgo: 2,
    visible_in_everyone: false,
    open_to_chat: true,
  })
  const nearby2 = profile(4, {
    username: 'arjun',
    display_name: 'Arjun Mehta',
    age: 31,
    headline: 'Founder, still shipping',
    location_text: 'Indiranagar, Bengaluru',
    latitude: 12.9784,
    longitude: 77.6408,
    hoursAgo: 5,
  })

  const now = new Date().toISOString()
  const campus: PoolRow = {
    id: uuid(301),
    name: 'CAMPUS',
    join_code: 'CAMPUS',
    created_by: seed.id,
    created_at: now,
  }
  return {
    users: [seed, test, nearby, nearby2],
    profile_items: [
      {
        id: uuid(101),
        user_id: nearby.id,
        kind: 'text',
        body: 'Looking for co-founders and coffee chats this week.',
        photo_url: null,
        position: 0,
        created_at: now,
        updated_at: now,
      },
      {
        id: uuid(102),
        user_id: nearby2.id,
        kind: 'text',
        body: 'Building in public. Always happy to swap notes.',
        photo_url: null,
        position: 0,
        created_at: now,
        updated_at: now,
      },
    ],
    messages: [
      {
        id: uuid(201),
        sender_id: nearby.id,
        recipient_id: seed.id,
        body: 'Hey — saw you on Discover. Coffee in Koramangala?',
        quote_kind: null,
        quote_text: null,
        is_seen: false,
        created_at: isoHoursAgo(1),
      },
    ],
    swipes: [],
    pools: [campus],
    pool_memberships: [
      { user_id: seed.id, pool_id: campus.id, visible: true, created_at: now },
      { user_id: nearby.id, pool_id: campus.id, visible: true, created_at: now },
    ],
    push_subscriptions: [],
    user_blocks: [],
    user_reports: [],
    accounts: [
      { id: seed.id, email: 'seed_user@gmail.com', password: PASSWORD, name: 'Seed User' },
      { id: test.id, email: 'test@example.com', password: PASSWORD, name: 'Test User' },
    ],
  }
}

function loadDb(): LocalDb {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LocalDb>
      const fallback = defaultDb()
      const fallbackById = new Map(fallback.users.map((row) => [row.id, row]))
      const users = (parsed.users ?? fallback.users).map((user) => ({
        ...user,
        visible_in_everyone: user.visible_in_everyone !== false,
        open_to_chat:
          typeof user.open_to_chat === 'boolean'
            ? user.open_to_chat
            : fallbackById.get(user.id)?.open_to_chat === true,
        basics_completed_at:
          user.basics_completed_at ??
          fallbackById.get(user.id)?.basics_completed_at ??
          user.created_at,
      }))
      return {
        users,
        profile_items: parsed.profile_items ?? fallback.profile_items,
        messages: parsed.messages ?? fallback.messages,
        swipes: parsed.swipes ?? [],
        pools: parsed.pools ?? [],
        pool_memberships: parsed.pool_memberships ?? [],
        push_subscriptions: parsed.push_subscriptions ?? [],
        user_blocks: parsed.user_blocks ?? [],
        user_reports: parsed.user_reports ?? [],
        accounts: parsed.accounts ?? fallback.accounts,
      }
    }
  } catch {
    /* ignore */
  }
  const db = defaultDb()
  localStorage.setItem(DB_KEY, JSON.stringify(db))
  return db
}

function saveDb(db: LocalDb) {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

function toUser(account: AuthAccount): User {
  return {
    id: account.id,
    email: account.email,
    aud: 'authenticated',
    role: 'authenticated',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { name: account.name, full_name: account.name },
    created_at: new Date().toISOString(),
  } as User
}

function toSession(account: AuthAccount): Session {
  const now = Math.floor(Date.now() / 1000)
  return {
    access_token: 'local-seed',
    refresh_token: 'local-seed',
    expires_in: 604800,
    expires_at: now + 604800,
    token_type: 'bearer',
    user: toUser(account),
  }
}

type Filter = (row: Record<string, unknown>) => boolean

function matchEqPart(row: Record<string, unknown>, part: string): boolean {
  const match = part.trim().match(/^(\w+)\.eq\.(.+)$/)
  if (!match) return false
  return String(row[match[1]]) === match[2]
}

function matchOrExpr(row: Record<string, unknown>, expr: string): boolean {
  const andGroups = [...expr.matchAll(/and\(([^)]+)\)/g)]
  if (andGroups.length > 0) {
    return andGroups.some((group) => group[1].split(',').every((part) => matchEqPart(row, part)))
  }
  return expr.split(',').some((part) => matchEqPart(row, part))
}

export function isLocalSeedEnabled(): boolean {
  return import.meta.env.VITE_LOCAL_SEED === 'true'
}

export function createLocalSupabase(): SupabaseClient {
  const authListeners = new Set<(session: Session | null) => void>()
  let db = loadDb()

  const ok = (data: unknown) => ({ data, error: null })
  const fail = (message: string) => ({ data: null, error: { message } })

  function tableRows(name: string): Record<string, unknown>[] {
    const rows = (db as unknown as Record<string, unknown[]>)[name]
    if (!Array.isArray(rows)) return []
    return rows as Record<string, unknown>[]
  }

  function setTable(name: string, rows: Record<string, unknown>[]) {
    ;(db as unknown as Record<string, unknown[]>)[name] = rows
    saveDb(db)
  }

  function from(table: string) {
    let action: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select'
    let payload: unknown = null
    let upsertConflict: string | undefined
    const filters: Filter[] = []
    let orderCol: string | null = null
    let ascending = true
    let wantSingle = false
    let wantMaybe = false

    const builder = {
      select() {
        return builder
      },
      insert(value: unknown) {
        action = 'insert'
        payload = value
        return builder
      },
      update(value: unknown) {
        action = 'update'
        payload = value
        return builder
      },
      delete() {
        action = 'delete'
        return builder
      },
      upsert(value: unknown, opts?: { onConflict?: string }) {
        action = 'upsert'
        payload = value
        upsertConflict = opts?.onConflict
        return builder
      },
      eq(column: string, value: unknown) {
        filters.push((row) => row[column] === value)
        return builder
      },
      or(expr: string) {
        filters.push((row) => matchOrExpr(row, expr))
        return builder
      },
      order(column: string, opts?: { ascending?: boolean }) {
        orderCol = column
        ascending = opts?.ascending !== false
        return builder
      },
      single() {
        wantSingle = true
        return builder
      },
      maybeSingle() {
        wantMaybe = true
        return builder
      },
      then<T>(resolve: (value: T) => T, reject?: (reason: unknown) => T) {
        return Promise.resolve(run() as T).then(resolve, reject)
      },
    }

    function run() {
      let rows = tableRows(table)
      const matches = (row: Record<string, unknown>) => filters.every((fn) => fn(row))

      if (action === 'insert') {
        const now = new Date().toISOString()
        const incoming = Array.isArray(payload) ? payload : [payload]
        const created = incoming.map((item) => ({
          id: crypto.randomUUID(),
          created_at: now,
          updated_at: now,
          ...(item as object),
        })) as Record<string, unknown>[]
        setTable(table, [...rows, ...created])
        rows = created
      } else if (action === 'update') {
        const next = rows.map((row) =>
          matches(row) ? { ...row, ...(payload as object), updated_at: new Date().toISOString() } : row,
        )
        const changed = next.filter((_row, i) => matches(rows[i]))
        setTable(table, next)
        rows = changed
      } else if (action === 'delete') {
        const kept = rows.filter((row) => !matches(row))
        rows = rows.filter(matches)
        setTable(table, kept)
      } else if (action === 'upsert') {
        const item = payload as Record<string, unknown>
        const keys = (upsertConflict ?? 'id').split(',').map((k) => k.trim())
        const idx = rows.findIndex((row) => keys.every((key) => row[key] === item[key]))
        const now = new Date().toISOString()
        const saved = { id: crypto.randomUUID(), created_at: now, updated_at: now, ...item }
        if (idx >= 0) {
          rows[idx] = { ...rows[idx], ...item, updated_at: now }
          setTable(table, rows)
          rows = [rows[idx]]
        } else {
          setTable(table, [...rows, saved])
          rows = [saved]
        }
      } else {
        rows = rows.filter(matches)
      }

      if (orderCol) {
        const col = orderCol
        rows = [...rows].sort((a, b) => {
          const av = String(a[col] ?? '')
          const bv = String(b[col] ?? '')
          return ascending ? av.localeCompare(bv) : bv.localeCompare(av)
        })
      }

      if (wantSingle || wantMaybe) {
        if (rows.length === 0) {
          return wantSingle ? fail('No rows') : ok(null)
        }
        return ok(rows[0])
      }
      return ok(rows)
    }

    return builder
  }

  const client = {
    from,
    rpc(name: string, args: {
      viewer_id?: string | null
      include_everyone?: boolean
      pool_ids?: string[]
      p_name?: string
      p_code?: string
      p_other_id?: string
      p_endpoint?: string
      p_p256dh?: string
      p_auth?: string
    }) {
      db = loadDb()
      const sessionUserId = (() => {
        try {
          const raw = localStorage.getItem(SESSION_KEY)
          if (!raw) return null
          return (JSON.parse(raw) as Session).user.id
        } catch {
          return null
        }
      })()

      if (name === 'create_pool') {
        if (!sessionUserId) return Promise.resolve(fail('Not authenticated'))
        const trimmed = (args.p_name ?? '').trim().toUpperCase()
        if (!trimmed) return Promise.resolve(fail('Group name is required'))
        const createdCount = db.pools.filter((p) => p.created_by === sessionUserId).length
        const memberCount = db.pool_memberships.filter((m) => m.user_id === sessionUserId).length
        if (createdCount >= 3) return Promise.resolve(fail('You can create at most 3 groups'))
        if (memberCount >= 3) return Promise.resolve(fail('You can be in at most 3 groups'))
        if (db.pools.some((p) => p.name.trim().toLowerCase() === trimmed.toLowerCase())) {
          return Promise.resolve(fail('That name is taken'))
        }
        const pool: PoolRow = {
          id: crypto.randomUUID(),
          name: trimmed,
          join_code: trimmed,
          created_by: sessionUserId,
          created_at: new Date().toISOString(),
        }
        db.pools.push(pool)
        db.pool_memberships.push({
          user_id: sessionUserId,
          pool_id: pool.id,
          visible: true,
          created_at: pool.created_at,
        })
        saveDb(db)
        return Promise.resolve(ok(pool))
      }

      if (name === 'join_pool') {
        if (!sessionUserId) return Promise.resolve(fail('Not authenticated'))
        const code = (args.p_code ?? '').trim().toUpperCase().replace(/\s+/g, '')
        if (!code) return Promise.resolve(fail('Group does not exist'))
        const compact = (value: string) => value.trim().toUpperCase().replace(/\s+/g, '')
        const found = db.pools.find(
          (p) => compact(p.join_code) === code || compact(p.name) === code,
        )
        if (!found) return Promise.resolve(fail('Group does not exist'))
        const already = db.pool_memberships.some((m) => m.user_id === sessionUserId && m.pool_id === found.id)
        if (!already) {
          if (db.pool_memberships.filter((m) => m.user_id === sessionUserId).length >= 3) {
            return Promise.resolve(fail('You can be in at most 3 groups'))
          }
          db.pool_memberships.push({
            user_id: sessionUserId,
            pool_id: found.id,
            visible: true,
            created_at: new Date().toISOString(),
          })
          saveDb(db)
        }
        return Promise.resolve(ok(found))
      }

      if (name === 'check_pool_name') {
        const trimmed = (args.p_name ?? '').trim().toUpperCase()
        if (!trimmed) return Promise.resolve(ok({ available: false, suggestions: [] }))
        const taken = new Set(db.pools.map((p) => p.name.trim().toUpperCase()))
        const available = !taken.has(trimmed)
        return Promise.resolve(
          ok({
            available,
            suggestions: available ? [] : suggestUnusedPoolNames(trimmed, taken),
          }),
        )
      }

      if (name === 'save_push_subscription') {
        if (!sessionUserId) return Promise.resolve(fail('Not authenticated'))
        const endpoint = args.p_endpoint ?? ''
        const p256dh = args.p_p256dh ?? ''
        const auth = args.p_auth ?? ''
        if (!endpoint || !p256dh || !auth) return Promise.resolve(fail('Missing subscription'))
        const now = new Date().toISOString()
        const existing = db.push_subscriptions.find((row) => row.endpoint === endpoint)
        if (existing) {
          existing.user_id = sessionUserId
          existing.p256dh = p256dh
          existing.auth = auth
          existing.updated_at = now
          saveDb(db)
          return Promise.resolve(ok(existing))
        }
        const row: PushSubscriptionRow = {
          id: crypto.randomUUID(),
          user_id: sessionUserId,
          endpoint,
          p256dh,
          auth,
          created_at: now,
          updated_at: now,
        }
        db.push_subscriptions.push(row)
        saveDb(db)
        return Promise.resolve(ok(row))
      }

      if (name === 'shared_pools') {
        if (!sessionUserId || !args.p_other_id || args.p_other_id === sessionUserId) {
          return Promise.resolve(ok([]))
        }
        const mine = new Set(
          db.pool_memberships.filter((m) => m.user_id === sessionUserId).map((m) => m.pool_id),
        )
        const data = db.pools.filter((pool) => {
          if (!mine.has(pool.id)) return false
          return db.pool_memberships.some(
            (m) => m.user_id === args.p_other_id && m.pool_id === pool.id && m.visible,
          )
        }).map((pool) => ({ id: pool.id, name: pool.name }))
        return Promise.resolve(ok(data))
      }

      if (name !== 'discover_profiles') {
        return Promise.resolve(fail(`Unknown rpc ${name}`))
      }
      const viewerId = args.viewer_id
      const everyone = args.include_everyone !== false
      const poolIds = new Set(args.pool_ids ?? [])
      const data = db.users.filter((user) => {
        if (!user.is_active || user.id === viewerId) return false
        if (
          viewerId &&
          db.user_blocks.some(
            (b) =>
              (b.blocker_id === viewerId && b.blocked_id === user.id) ||
              (b.blocker_id === user.id && b.blocked_id === viewerId),
          )
        ) {
          return false
        }
        if (everyone && user.visible_in_everyone) return true
        return (db.pool_memberships ?? []).some(
          (m) => m.user_id === user.id && m.visible && poolIds.has(m.pool_id),
        )
      })
      return Promise.resolve(ok(data))
    },
    storage: {
      from() {
        return {
          async upload(path: string, file: Blob) {
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader()
              reader.onload = () => resolve(String(reader.result))
              reader.onerror = () => reject(reader.error)
              reader.readAsDataURL(file)
            })
            localStorage.setItem(`meetly-local-file:${path}`, dataUrl)
            return ok({ path })
          },
          getPublicUrl(path: string) {
            return { data: { publicUrl: localStorage.getItem(`meetly-local-file:${path}`) ?? '' } }
          },
        }
      },
    },
    functions: {
      invoke() {
        return Promise.resolve({ data: null, error: null })
      },
    },
    channel() {
      return {
        on() {
          return this
        },
        subscribe() {
          return this
        },
      }
    },
    removeChannel() {
      return Promise.resolve('ok')
    },
    auth: {
      async getSession() {
        try {
          const raw = localStorage.getItem(SESSION_KEY)
          return ok({ session: raw ? (JSON.parse(raw) as Session) : null })
        } catch {
          return ok({ session: null })
        }
      },
      onAuthStateChange(callback: (event: string, session: Session | null) => void) {
        const listener = (session: Session | null) => callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session)
        authListeners.add(listener)
        return { data: { subscription: { unsubscribe: () => authListeners.delete(listener) } } }
      },
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        db = loadDb()
        const account = db.accounts.find((a) => a.email === email && a.password === password)
        if (!account) return fail('Invalid login credentials')
        const session = toSession(account)
        localStorage.setItem(SESSION_KEY, JSON.stringify(session))
        authListeners.forEach((fn) => fn(session))
        return ok({ user: session.user, session })
      },
      async signInWithOAuth() {
        return fail('Local seed mode uses email login (seed_user@gmail.com / password123)')
      },
      async signOut() {
        localStorage.removeItem(SESSION_KEY)
        authListeners.forEach((fn) => fn(null))
        return ok({})
      },
    },
  }

  return client as unknown as SupabaseClient
}
