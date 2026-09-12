import type { Cruise, LatLng, Place } from '../types'

const R_KM = 6371

export function haversine(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(s)))
}

function rad(d: number): number {
  return (d * Math.PI) / 180
}

export function walkMinutes(cruise: Cruise, you: LatLng): number {
  const km = haversine(you, cruise.map.pier)
  const ruinsKm = Math.max(0.2, haversine(cruise.map.ruins, cruise.map.pier))
  return clamp(3, 55, 3 + (km / ruinsKm) * 42)
}

export function nearestPlace(cruise: Cruise, you: LatLng): Place {
  const spots = ['pier', 'town', 'ruins'] as const
  let best: Place = 'custom'
  let bestKm = 0.45
  for (const id of spots) {
    const km = haversine(you, cruise.map[id])
    if (km < bestKm) {
      best = id
      bestKm = km
    }
  }
  return best
}

export function placeOf(cruise: Cruise, place: Place, fallback: LatLng): LatLng {
  if (place === 'custom') return fallback
  return cruise.map[place]
}

function clamp(min: number, max: number, n: number): number {
  return Math.max(min, Math.min(max, n))
}
