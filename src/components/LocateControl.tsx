import L, { type LatLngTuple } from 'leaflet'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMap } from 'react-leaflet'

interface Props {
  onLocate: () => Promise<LatLngTuple | null>
  zoom: number
  disabled?: boolean
}

/** Leaflet control (top-left, below the zoom buttons) that recenters the map on the user. */
export default function LocateControl({ onLocate, zoom, disabled = false }: Props) {
  const map = useMap()
  const [busy, setBusy] = useState(false)

  const container = useMemo(() => {
    const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control')
    L.DomEvent.disableClickPropagation(div)
    return div
  }, [])

  useEffect(() => {
    const control = new L.Control({ position: 'topleft' })
    control.onAdd = () => container
    control.addTo(map)
    return () => {
      control.remove()
    }
  }, [map, container])

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    if (busy || disabled) return
    setBusy(true)
    try {
      const position = await onLocate()
      if (position) map.flyTo(position, zoom)
    } finally {
      setBusy(false)
    }
  }

  const label = disabled ? 'Geolocalización no disponible' : 'Ir a mi ubicación'

  return createPortal(
    <a
      href="#"
      role="button"
      title={label}
      aria-label={label}
      aria-disabled={disabled || busy}
      onClick={handleClick}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      className={disabled ? 'leaflet-disabled' : undefined}
    >
      <svg
        viewBox="0 0 24 24"
        className={`size-[18px] ${busy ? 'animate-pulse' : ''}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="7" />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
        <path d="M12 1v4M12 19v4M1 12h4M19 12h4" />
      </svg>
    </a>,
    container,
  )
}
