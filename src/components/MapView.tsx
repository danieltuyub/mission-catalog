import L, { type LatLngTuple } from 'leaflet'
import { useEffect, useState } from 'react'
import {
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import { useGeolocation, type GeoStatus } from '../hooks/useGeolocation'
import { usePins } from '../hooks/usePins'
import PinFormModal from './PinFormModal'

const DEFAULT_CENTER: LatLngTuple = [20, 0]
const DEFAULT_ZOOM = 2
const LOCATED_ZOOM = 15

const pinIcon = L.divIcon({
  className: '',
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -36],
  html: `<svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 0C7.2 0 0 7 0 15.7 0 27 16 40 16 40s16-13 16-24.300C32 7 24.800 0 16 0z" fill="#4f46e5"/>
    <circle cx="16" cy="15.500" r="6" fill="#fff"/>
  </svg>`,
})

const GEO_MESSAGES: Partial<Record<GeoStatus, string>> = {
  loading: 'Locating you…',
  denied: 'Location permission denied. Showing default view.',
  unavailable: 'Could not determine your location.',
  unsupported: 'Geolocation is not supported by this browser.',
}

function FlyToPosition({ position }: { position: LatLngTuple | null }) {
  const map = useMap()
  useEffect(() => {
    if (position) map.flyTo(position, LOCATED_ZOOM)
  }, [map, position])
  return null
}

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onClick(e.latlng.lat, e.latlng.lng) })
  return null
}

export default function MapView() {
  const { status, position } = useGeolocation()
  const { pins, error, addPin } = usePins()
  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null)

  const notice = error ?? GEO_MESSAGES[status]

  return (
    <div className="relative h-full w-full">
      <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyToPosition position={position} />
        <ClickHandler onClick={(lat, lng) => setDraft({ lat, lng })} />

        {position && (
          <CircleMarker
            center={position}
            radius={8}
            pathOptions={{ color: '#fff', weight: 2, fillColor: '#2563eb', fillOpacity: 1 }}
          />
        )}

        {pins.map((pin) => (
          <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={pinIcon}>
            <Popup>
              <strong>{pin.title}</strong>
              {pin.description && <p className="mt-1">{pin.description}</p>}
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {notice && (
        <div className="absolute left-1/2 top-3 z-[1000] -translate-x-1/2 rounded-md bg-white/95 px-3 py-1.5 text-sm text-gray-700 shadow">
          {notice}
        </div>
      )}

      {draft && (
        <PinFormModal
          lat={draft.lat}
          lng={draft.lng}
          onCancel={() => setDraft(null)}
          onSubmit={async (data) => {
            await addPin({ ...draft, ...data })
            setDraft(null)
          }}
        />
      )}
    </div>
  )
}
