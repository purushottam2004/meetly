self.addEventListener('push', (event) => {
  let payload = {
    title: 'Someone',
    body: 'Sent a message',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'chat',
    data: { url: '/chats' },
  }
  try {
    if (event.data) payload = { ...payload, ...event.data.json() }
  } catch {
    /* keep defaults */
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
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
