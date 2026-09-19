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

// Leaflet's default marker is a bundled PNG that breaks under bundlers; a
// div-based pin also lets the markers carry the app's own colours.
function pin(color: string) {
  return L.divIcon({
    className: 'map-pin',
    html: `<span style="background:${color}"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
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

    L.marker([lat, lng], { icon: pin('#3E63DD') }).addTo(map)

    if (secondaryLat != null && secondaryLng != null) {
      L.marker([secondaryLat, secondaryLng], { icon: pin('#D2694F') }).addTo(map)
      map.fitBounds(L.latLngBounds([lat, lng], [secondaryLat, secondaryLng]), {
        padding: [26, 26],
        maxZoom: 14,
      })
    } else {
      map.setView([lat, lng], 13)
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
