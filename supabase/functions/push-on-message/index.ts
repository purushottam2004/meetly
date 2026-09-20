import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import webpush from 'npm:web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type MessageRecord = {
  id: string
  sender_id: string
  recipient_id: string
  body: string
  quote_kind: string | null
}

type PushRow = {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

type InvokeBody = {
  messageId?: string
  type?: string
  table?: string
  record?: MessageRecord
}

const TITLE_FALLBACK = 'Someone'
const BODY_MAX = 80

export function previewBody(body: string, quoteKind: string | null): string {
  const trimmed = (body ?? '').trim()
  if (trimmed) {
    return trimmed.length <= BODY_MAX ? trimmed : `${trimmed.slice(0, BODY_MAX - 1)}…`
  }
  if (quoteKind === 'photo') return 'Photo'
  return 'Sent a message'
}

export function senderTitle(profile: { display_name: string | null; username: string | null } | null): string {
  const name = profile?.display_name?.trim() || profile?.username?.trim()
  return name || TITLE_FALLBACK
}

function readJwt(req: Request): { sub: string | null; role: string | null } {
  const auth = req.headers.get('Authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  const parts = token.split('.')
  if (parts.length < 2) return { sub: null, role: null }
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as {
      sub?: string
      role?: string
    }
    return { sub: payload.sub ?? null, role: payload.role ?? null }
  } catch {
    return { sub: null, role: null }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')
  if (!vapidPublic || !vapidPrivate) {
    return json({ skipped: true, reason: 'missing_vapid_keys' }, 200)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'missing_supabase_env' }, 500)
  }

  const jwt = readJwt(req)
  let payload: InvokeBody
  try {
    payload = (await req.json()) as InvokeBody
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  const admin = createClient(supabaseUrl, serviceKey)
  const message = await loadMessage(admin, payload, jwt)
  if ('error' in message) {
    return json({ error: message.error }, message.status)
  }

  const { data: sender } = await admin
    .from('users')
    .select('display_name, username')
    .eq('id', message.row.sender_id)
    .maybeSingle()

  const title = senderTitle(sender)
  const body = previewBody(message.row.body, message.row.quote_kind)
  const url = `/chats/${message.row.sender_id}`
  const tag = `chat:${message.row.sender_id}`

  const { data: subs, error: subError } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', message.row.recipient_id)

  if (subError) return json({ error: subError.message }, 500)
  const subscriptions = (subs ?? []) as PushRow[]
  if (subscriptions.length === 0) {
    return json({ sent: 0 }, 200)
  }

  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT') ?? 'mailto:meetly-local@localhost',
    vapidPublic,
    vapidPrivate,
  )

  const notification = JSON.stringify({
    title,
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag,
    renotify: true,
    data: { url },
  })

  let sent = 0
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        notification,
      )
      sent += 1
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode
      if (statusCode === 404 || statusCode === 410) {
        await admin.from('push_subscriptions').delete().eq('id', sub.id)
      }
    }
  }

  return json({ sent }, 200)
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function loadMessage(
  admin: ReturnType<typeof createClient>,
  payload: InvokeBody,
  jwt: { sub: string | null; role: string | null },
): Promise<{ row: MessageRecord } | { error: string; status: number }> {
  const fromWebhook = payload.type === 'INSERT' && payload.record?.id
  const messageId = fromWebhook ? payload.record!.id : payload.messageId
  if (!messageId) return { error: 'missing_message_id', status: 400 }

  const { data, error } = await admin.from('messages').select('*').eq('id', messageId).maybeSingle()
  if (error) return { error: error.message, status: 500 }
  if (!data) return { error: 'message_not_found', status: 404 }

  const row = data as MessageRecord
  if (jwt.role !== 'service_role' && jwt.sub !== row.sender_id) {
    return { error: 'forbidden', status: 403 }
  }
  return { row }
}
