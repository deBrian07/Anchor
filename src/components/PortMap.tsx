import { useEffect, useRef } from 'react'
import L from 'leaflet'
import type { Cruise, LatLng } from '../types'

type Props = {
  cruise: Cruise
  you: LatLng
  departed: boolean
  onYouChange: (next: LatLng) => void
}

const YOU_HTML = `<span class="you-dot"></span>`
const SHIP_HTML = `<span class="ship-mark"><span class="ship-wake"></span><span class="ship-hull"></span></span>`

export function PortMap({ cruise, you, departed, onYouChange }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const youRef = useRef<L.Marker | null>(null)
  const shipRef = useRef<L.Marker | null>(null)
  const cruiseRef = useRef(cruise)
  const onYouChangeRef = useRef(onYouChange)
  cruiseRef.current = cruise
  onYouChangeRef.current = onYouChange

  useEffect(() => {
    const el = rootRef.current
    if (!el || mapRef.current) return

    const map = L.map(el, {
      zoomControl: false,
      attributionControl: false,
      minZoom: 11,
      maxZoom: 16,
    })
    mapRef.current = map

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map)

    const cruise = cruiseRef.current
    const pier = cruise.map.pier
    const pierBox: L.LatLngExpression[] = [
      [pier.lat - 0.0016, pier.lng - 0.0011],
      [pier.lat - 0.0016, pier.lng + 0.0024],
      [pier.lat + 0.0022, pier.lng + 0.0024],
      [pier.lat + 0.0022, pier.lng - 0.0011],
    ]
    L.polygon(pierBox, {
      color: '#e8c36a',
      weight: 2,
      fillColor: '#3a2d14',
      fillOpacity: 0.55,
    }).addTo(map)

    L.marker([pier.lat, pier.lng], {
      icon: L.divIcon({ className: 'map-label', html: 'PIER', iconSize: [48, 18] }),
      interactive: false,
    }).addTo(map)
    L.marker([cruise.map.town.lat, cruise.map.town.lng], {
      icon: L.divIcon({ className: 'map-label dim', html: 'TOWN', iconSize: [52, 18] }),
      interactive: false,
    }).addTo(map)
    L.marker([cruise.map.ruins.lat, cruise.map.ruins.lng], {
      icon: L.divIcon({ className: 'map-label dim', html: 'RUINS', iconSize: [56, 18] }),
      interactive: false,
    }).addTo(map)

    const ship = L.marker([pier.lat, pier.lng - 0.0014], {
      icon: L.divIcon({ className: 'ship-icon', html: SHIP_HTML, iconSize: [36, 56], iconAnchor: [18, 28] }),
      interactive: false,
    }).addTo(map)
    shipRef.current = ship

    const startYou = cruiseRef.current.map.town
    const youMarker = L.marker([startYou.lat, startYou.lng], {
      draggable: true,
      icon: L.divIcon({ className: 'you-icon', html: YOU_HTML, iconSize: [22, 22], iconAnchor: [11, 11] }),
    }).addTo(map)
    youMarker.on('dragend', () => {
      const p = youMarker.getLatLng()
      onYouChangeRef.current({ lat: p.lat, lng: p.lng })
    })
    youRef.current = youMarker

    map.fitBounds(
      [
        [cruise.map.ruins.lat, cruise.map.ruins.lng],
        [pier.lat, cruise.map.ship_departed.lng],
      ],
      { padding: [40, 40] },
    )

    return () => {
      map.remove()
      mapRef.current = null
      youRef.current = null
      shipRef.current = null
    }
  }, [])

  useEffect(() => {
    const marker = youRef.current
    const map = mapRef.current
    if (!marker || !map) return
    const cur = marker.getLatLng()
    if (Math.abs(cur.lat - you.lat) > 1e-6 || Math.abs(cur.lng - you.lng) > 1e-6) {
      marker.setLatLng([you.lat, you.lng])
      map.panTo([you.lat, you.lng], { animate: true, duration: 0.6 })
    }
  }, [you])

  useEffect(() => {
    const ship = shipRef.current
    const map = mapRef.current
    if (!ship || !map) return
    const start = L.latLng(cruise.map.pier.lat, cruise.map.pier.lng - 0.0014)
    const end = L.latLng(cruise.map.ship_departed.lat, cruise.map.ship_departed.lng)
    if (!departed) {
      ship.setLatLng(start)
      const el = ship.getElement()
      el?.classList.remove('sailing')
      return
    }

    const el = ship.getElement()
    el?.classList.add('sailing')
    const t0 = performance.now()
    const dur = 2800
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / dur)
      const ease = 1 - (1 - t) ** 3
      const lat = start.lat + (end.lat - start.lat) * ease
      const lng = start.lng + (end.lng - start.lng) * ease
      ship.setLatLng([lat, lng])
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    map.fitBounds(
      [
        [start.lat, start.lng],
        [end.lat, end.lng],
        [you.lat, you.lng],
      ],
      { padding: [48, 48], animate: true },
    )
    return () => cancelAnimationFrame(raf)
  }, [departed, cruise, you.lat, you.lng])

  return (
    <section className="map-panel">
      <div className="map-fallback" />
      <div ref={rootRef} className="map-canvas" />
      <p className="map-caption">
        {cruise.pier_name ?? 'Pier'} · {cruise.port}
      </p>
    </section>
  )
}
