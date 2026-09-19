import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { LatLng } from '../lib/types'

type MapBlockProps = {
  /** The viewed profile's location. */
  primary: LatLng
  /** The signed-in viewer's own location, when they have one saved. */
  secondary?: LatLng | null
}

/** Nobody's exact address goes on the map — just the area they're in. */
const PRIVACY_RADIUS_METRES = 500

function area(map: L.Map, at: L.LatLngExpression, color: string) {
  return L.circle(at, {
    radius: PRIVACY_RADIUS_METRES,
    color,
    weight: 1.5,
    opacity: 0.7,
    fillColor: color,
    fillOpacity: 0.18,
  }).addTo(map)
}

export function MapBlock({ primary, secondary }: MapBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { lat, lng } = primary
  const secondaryLat = secondary?.lat ?? null
  const secondaryLng = secondary?.lng ?? null

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const map = L.map(container, {
      // A view has to exist before any layer is added: circles project their
      // radius to pixels on add, and throw without one.
      center: [lat, lng],
      zoom: 14,
      // Keep it a calm preview inside a scrollable card rather than a map the
      // user can wrestle with mid-swipe.
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false,
      zoomControl: false,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)

    const theirs = area(map, [lat, lng], '#3E63DD')

    if (secondaryLat != null && secondaryLng != null) {
      const mine = area(map, [secondaryLat, secondaryLng], '#D2694F')
      map.fitBounds(theirs.getBounds().extend(mine.getBounds()), { padding: [14, 14], maxZoom: 15 })
    } else {
      map.fitBounds(theirs.getBounds(), { padding: [14, 14], maxZoom: 15 })
    }

    // The card mounts inside an animating container, so the map can measure
    // itself before the box has its final size.
    const resize = setTimeout(() => map.invalidateSize(), 0)

    return () => {
      clearTimeout(resize)
      map.remove()
    }
  }, [lat, lng, secondaryLat, secondaryLng])

  return <div className="map-box" ref={containerRef} />
}
