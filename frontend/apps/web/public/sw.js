/** Opaque Meetly mark. Transparent /icon-192.png is ignored by Chrome and
 *  replaced with the Chrome logo on macOS and Android notifications. */
const NOTIFICATION_ICON = '/apple-touch-icon.png'

function assetUrl(path) {
  return new URL(path, self.location.origin).href
}

self.addEventListener('push', (event) => {
  let payload = {
    title: 'Someone',
    body: 'Sent a message',
    tag: 'chat',
    data: { url: '/chats' },
  }
  try {
    if (event.data) payload = { ...payload, ...event.data.json() }
  } catch {
    /* keep defaults */
  }

  const icon = assetUrl(NOTIFICATION_ICON)

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon,
      badge: icon,
      tag: payload.tag,
      renotify: true,
      data: payload.data,
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const path = event.notification.data?.url || '/chats'
  const target = new URL(path, self.location.origin).href

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of windows) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          await client.focus()
          if ('navigate' in client) await client.navigate(target)
          return
        }
      }
      await self.clients.openWindow(target)
    })(),
  )
})
