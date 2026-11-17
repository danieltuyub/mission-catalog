import L, { type LatLngTuple } from 'leaflet'
import { useEffect } from 'react'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import { pinIcon, selectedPinIcon } from './pinIcons'

export interface MapPin {
  id: string
  position: LatLngTuple
}

interface Props {
  /** Keep this array stable between renders: the map fits to it whenever it changes. */
  pins: MapPin[]
  selectedId: string | null
  onSelect: (id: string) => void
  /** False while the map is hidden (a display:none container has no size to draw in). */
  visible: boolean
  className?: string
}

const SELECTED_ZOOM = 13

function Camera({ pins, selected, visible }: { pins: MapPin[]; selected: LatLngTuple | null; visible: boolean }) {
  const map = useMap()

  // A container that was hidden has no size: measure it again when it shows.
  useEffect(() => {
    if (visible) map.invalidateSize()
  }, [map, visible])

  // The pins in view (the list's filters) change: show them all.
  useEffect(() => {
    if (pins.length > 0) map.fitBounds(L.latLngBounds(pins.map((p) => p.position)), { padding: [40, 40], maxZoom: 12 })
  }, [map, pins])

  // A pin was chosen: go there, without zooming out if the map is closer already.
  useEffect(() => {
    if (selected) map.flyTo(selected, Math.max(map.getZoom(), SELECTED_ZOOM))
  }, [map, selected])

  return null
}

/** The admin's map: the pins of the list, their exact places, and the chosen one highlighted. */
export default function AdminPinsMap({ pins, selectedId, onSelect, visible, className = '' }: Props) {
  const selected = pins.find((p) => p.id === selectedId)
  const selectedLat = selected?.position[0]
  const selectedLng = selected?.position[1]
  // By value: the same pin chosen again must not re-center the map after the user moved it, but a new one must.
  const target: LatLngTuple | null = selectedLat !== undefined && selectedLng !== undefined ? [selectedLat, selectedLng] : null

  return (
    <div className={`overflow-hidden rounded-2xl shadow ring-1 ring-black/5 ${className}`}>
      <MapContainer center={[20, 0]} zoom={2} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Camera pins={pins} selected={target} visible={visible} />
        {pins.map((p) => (
          <Marker
            key={p.id}
            position={p.position}
            icon={p.id === selectedId ? selectedPinIcon : pinIcon}
            zIndexOffset={p.id === selectedId ? 1000 : 0}
            eventHandlers={{ click: () => onSelect(p.id) }}
          />
        ))}
      </MapContainer>
    </div>
  )
}
