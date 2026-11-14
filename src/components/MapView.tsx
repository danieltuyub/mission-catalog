import L, { type LatLngTuple } from 'leaflet'
import { useEffect, useState } from 'react'
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import { useAuth } from '../hooks/useAuth'
import { useGeolocation, type GeoStatus } from '../hooks/useGeolocation'
import { usePins } from '../hooks/usePins'
import { loadMapView, saveMapView } from '../services/mapViewStorage'
import { can } from '../services/permissions'
import LocateControl from './LocateControl'
import PinCard from './PinCard'
import PinFormModal from './PinFormModal'
import TrackpadNavigation from './TrackpadNavigation'

const DEFAULT_CENTER: LatLngTuple = [20, 0]
const DEFAULT_ZOOM = 2
const LOCATED_ZOOM = 13

const createPinIcon = (color: string) =>
  L.divIcon({
    className: '',
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -36],
    html: `<svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 0C7.2 0 0 7 0 15.7 0 27 16 40 16 40s16-13 16-24.300C32 7 24.800 0 16 0z" fill="${color}"/>
    <circle cx="16" cy="15.500" r="6" fill="#fff"/>
  </svg>`,
  })

const pinIcon = createPinIcon('#0e1428')
const selectedPinIcon = createPinIcon('#7b9e89')

const userIcon = L.divIcon({
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  html: '<div style="width:16px;height:16px;box-sizing:border-box;border-radius:9999px;background:#2563eb;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.25)"></div>',
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

function ViewPersistor() {
  const map = useMapEvents({
    moveend: () => {
      const { lat, lng } = map.getCenter()
      saveMapView({ center: [lat, lng], zoom: map.getZoom() })
    },
  })
  return null
}

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onClick(e.latlng.lat, e.latlng.lng) })
  return null
}

export default function MapView() {
  const [savedView] = useState(loadMapView)
  const { status, position, locate } = useGeolocation()
  const canWritePins = can(useAuth(), 'pins.write')
  const { pins, error, addPin, editPin } = usePins()
  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = pins.find((p) => p.id === selectedId) ?? null
  const editing = pins.find((p) => p.id === editingId) ?? null

  useEffect(() => {
    if (!selectedId || draft || editingId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setSelectedId(null)
      // The clicked marker keeps focus; after a key press the browser draws a focus ring on it.
      const active = document.activeElement
      if (active instanceof HTMLElement && active.closest('.leaflet-marker-icon')) active.blur()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId, draft, editingId])

  const notice = error ?? GEO_MESSAGES[status]

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={savedView?.center ?? DEFAULT_CENTER}
        zoom={savedView?.zoom ?? DEFAULT_ZOOM}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyToPosition position={savedView ? null : position} />
        <ViewPersistor />
        <TrackpadNavigation />
        <LocateControl onLocate={locate} zoom={LOCATED_ZOOM} disabled={status === 'unsupported'} />
        <ClickHandler
          onClick={(lat, lng) => {
            if (selectedId) setSelectedId(null)
            else if (canWritePins) setDraft({ lat, lng })
          }}
        />

        {position && (
          <Marker position={position} icon={userIcon} interactive={false} keyboard={false} />
        )}

        {pins.map((pin) => (
          <Marker
            key={pin.id}
            position={[pin.lat, pin.lng]}
            icon={pin.id === selectedId ? selectedPinIcon : pinIcon}
            zIndexOffset={pin.id === selectedId ? 1000 : 0}
            eventHandlers={{ click: () => setSelectedId(pin.id) }}
          />
        ))}
      </MapContainer>

      <PinCard pin={selected} onClose={() => setSelectedId(null)} onEdit={canWritePins ? (pin) => setEditingId(pin.id) : undefined} />

      {notice && (
        <div className="absolute left-1/2 top-3 z-[1000] -translate-x-1/2 rounded-md bg-white/95 px-3 py-1.5 text-sm text-gray-700 shadow">
          {notice}
        </div>
      )}

      {editing && (
        <PinFormModal
          key={editing.id}
          lat={editing.lat}
          lng={editing.lng}
          pin={editing}
          onCancel={() => setEditingId(null)}
          onSubmit={async ({ image, removeImage, ...data }) => {
            await editPin(editing, data, image, removeImage)
            setEditingId(null)
          }}
        />
      )}

      {draft && (
        <PinFormModal
          lat={draft.lat}
          lng={draft.lng}
          onCancel={() => setDraft(null)}
          onSubmit={async ({ image, ...data }) => {
            await addPin({ ...draft, ...data }, image)
            setDraft(null)
          }}
        />
      )}
    </div>
  )
}
