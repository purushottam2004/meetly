/** Compact age of a timestamp: "now", "5m", "3h", "2d". */
export function formatRelativeTime(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.round(hours / 24)}d`
}

/** Human phrasing for a profile's last_active_at. */
export function formatLastSeen(iso: string): string {
  const relative = formatRelativeTime(iso)
  return relative === 'now' ? 'Active now' : `Seen ${relative} ago`
}
