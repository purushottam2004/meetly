export type LatLng = { lat: number; lng: number }

const STATIC_MAP_BASE = 'https://maps.googleapis.com/maps/api/staticmap'

/**
 * Returns null (no map) when the API key isn't configured, so callers can
 * fall back to a plain location line instead of a broken image.
 */
export function buildStaticMapUrl(primary: LatLng, secondary?: LatLng | null): string | null {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  if (!key) return null

  const params = new URLSearchParams({ size: '600x300', scale: '2', key })
  params.append('markers', `color:red|${primary.lat},${primary.lng}`)
  if (secondary) {
    params.append('markers', `color:blue|${secondary.lat},${secondary.lng}`)
  }
  return `${STATIC_MAP_BASE}?${params.toString()}`
}
