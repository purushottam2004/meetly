import { supabase } from './supabaseClient'

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i)
  return output
}

function canUsePush(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  )
}

/**
 * Prompt on login while permission is still `default`. Dismissing the prompt
 * leaves it `default`, so the next login asks again; Allow and Block are both
 * final and never re-prompt. If they Allow, store a Web Push subscription so
 * new DMs can notify them with the app closed (Android Chrome; iPhone only
 * after Add to Home Screen).
 */
export async function enableMessagePush(): Promise<void> {
  try {
    await enableMessagePushInner()
  } catch {
    /* missing SW, denied permission, or table not migrated yet */
  }
}

async function enableMessagePushInner(): Promise<void> {
  if (!canUsePush()) return
  const vapidPublic = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
  if (!vapidPublic) return

  if (Notification.permission === 'default') {
    await Notification.requestPermission()
  }
  if (Notification.permission !== 'granted') return

  await navigator.serviceWorker.register('/sw.js')
  const registration = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('service worker timeout')), 8000)
    }),
  ])
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublic) as BufferSource,
    })
  }

  const json = subscription.toJSON()
  const endpoint = json.endpoint
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth
  if (!endpoint || !p256dh || !auth) return

  await supabase.rpc('save_push_subscription', {
    p_endpoint: endpoint,
    p_p256dh: p256dh,
    p_auth: auth,
  })
}
