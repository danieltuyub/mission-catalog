import L, { type LatLngBoundsLiteral, type LatLngTuple } from 'leaflet'
import 'leaflet-gesture-handling'
import 'leaflet-gesture-handling/dist/leaflet-gesture-handling.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { useGeolocation, type GeoStatus } from '../hooks/useGeolocation'
import { usePins } from '../hooks/usePins'
import { loadMapView, saveMapView } from '../services/mapViewStorage'
import { can } from '../services/permissions'
import type { Pin } from '../types'
import { PIN_PRIVACY_RADIUS_M } from '../services/pinPrivacy'
import { setPinContact } from '../services/pinContacts'
import { requestPin } from '../services/pinRequests'
import { readSharedPinId } from '../services/shareProject'
import { showToast } from '../services/toast'
import { pinIcon, selectedPinIcon } from './pinIcons'
import LocateControl from './LocateControl'
import PinCard from './PinCard'
import PinFormModal from './PinFormModal'
import RequestPinButton from './RequestPinButton'
import TrackpadNavigation from './TrackpadNavigation'

const DEFAULT_CENTER: LatLngTuple = [20, 0]
const DEFAULT_ZOOM = 3
/** Streets and buildings stay out of reach, and the whole world is never shown (or repeated). */
const MIN_ZOOM = 3
const MAX_ZOOM = 14
const WORLD_BOUNDS: LatLngBoundsLiteral = [
  [-85, -180],
  [85, 180],
]
const LOCATED_ZOOM = 13

const userIcon = L.divIcon({
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  html: '<div style="width:16px;height:16px;box-sizing:border-box;border-radius:9999px;background:#2563eb;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.25)"></div>',
})

const GEO_KEYS = {
  loading: 'notice.locating',
  denied: 'notice.denied',
  unavailable: 'notice.unavailable',
  unsupported: 'notice.unsupported',
} as const satisfies Partial<Record<GeoStatus, string>>

function FlyToPosition({ position }: { position: LatLngTuple | null }) {
  const map = useMap()
  useEffect(() => {
    if (position) map.flyTo(position, LOCATED_ZOOM)
  }, [map, position])
  return null
}

/** Centers the map on a pin opened from a shared link. */
function FocusPin({ target }: { target: LatLngTuple | null }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.setView(target, LOCATED_ZOOM)
  }, [map, target])
  return null
}

/** Below this zoom a 1 km circle is smaller than a few pixels: the marker alone says where the pin is. */
const MIN_AREA_ZOOM = 11

/**
 * The approximate area of the selected pin, and only of it: nothing is drawn while no pin is selected.
 * Not drawn while the map zooms either: the browser scales the vector layer as a bitmap during the
 * animation, and a tiny circle of a far-away map turns into a huge pixelated blob.
 */
function PrivacyArea({ pin }: { pin: Pin | null }) {
  const map = useMap()
  const [zoom, setZoom] = useState(() => map.getZoom())
  const [zooming, setZooming] = useState(false)
  useMapEvents({
    zoomstart: () => setZooming(true),
    zoomend: () => {
      setZoom(map.getZoom())
      setZooming(false)
    },
  })

  if (!pin || zooming || zoom < MIN_AREA_ZOOM) return null
  return (
    <Circle
      key={pin.id}
      center={[pin.lat, pin.lng]}
      radius={PIN_PRIVACY_RADIUS_M}
      interactive={false}
      pathOptions={{ color: '#7b9e89', weight: 1, opacity: 0.6, fillOpacity: 0.16 }}
    />
  )
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
  const { t } = useTranslation('map')
  const [savedView] = useState(loadMapView)
  const { status, position, locate } = useGeolocation()
  const auth = useAuth()
  const canWritePins = can(auth, 'pins.write')
  // Admins create pins directly; everyone else with the permission proposes them.
  const canRequestPins = !canWritePins && can(auth, 'pins.request')
  const { pins, error, addPin, editPin } = usePins()
  const [placing, setPlacing] = useState(false)
  const [draft, setDraft] = useState<{ lat: number; lng: number; request: boolean } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  // A shared link (`#/mapa?pin=<id>`) opens on that pin as soon as the pins are loaded.
  const [sharedId] = useState(readSharedPinId)
  const [selectedId, setSelectedId] = useState<string | null>(sharedId)
  const sharedPin = sharedId ? pins.find((p) => p.id === sharedId) : undefined
  const sharedLat = sharedPin?.lat
  const sharedLng = sharedPin?.lng
  // By value: editing the pin must not pull the map back to it.
  const focus = useMemo<LatLngTuple | null>(
    () => (sharedLat !== undefined && sharedLng !== undefined ? [sharedLat, sharedLng] : null),
    [sharedLat, sharedLng],
  )
  const missingShown = useRef(false)
  const selected = pins.find((p) => p.id === selectedId) ?? null
  const editing = pins.find((p) => p.id === editingId) ?? null

  useEffect(() => {
    if (!sharedId || sharedPin || pins.length === 0 || missingShown.current) return
    missingShown.current = true
    showToast(t('pinNotFound'))
  }, [sharedId, sharedPin, pins.length, t])

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

  useEffect(() => {
    if (!placing) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPlacing(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [placing])

  const notice = placing ? t('notice.placing') : (error ?? (status in GEO_KEYS ? t(GEO_KEYS[status as keyof typeof GEO_KEYS]) : undefined))

  // Touch only: one finger scrolls the page, two move the map. Desktop keeps its own wheel/trackpad handling.
  const gesture = {
    gestureHandling: L.Browser.mobile,
    gestureHandlingOptions: { text: { touch: t('gesture.touch'), scroll: t('gesture.scroll'), scrollMac: t('gesture.scroll') } },
  }

  return (
    <div className="relative h-full w-full">
      <MapContainer
        {...gesture}
        center={savedView?.center ?? DEFAULT_CENTER}
        zoom={savedView?.zoom ?? DEFAULT_ZOOM}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        maxBounds={WORLD_BOUNDS}
        maxBoundsViscosity={1}
        scrollWheelZoom={false}
        className={`h-full w-full ${placing ? '[&.leaflet-grab]:cursor-crosshair' : ''}`}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyToPosition position={savedView || sharedId ? null : position} />
        <FocusPin target={focus} />
        <ViewPersistor />
        <TrackpadNavigation />
        <LocateControl onLocate={locate} zoom={LOCATED_ZOOM} disabled={status === 'unsupported'} />
        <ClickHandler
          onClick={(lat, lng) => {
            if (placing) {
              setSelectedId(null)
              setPlacing(false)
              setDraft({ lat, lng, request: true })
            } else if (selectedId) setSelectedId(null)
            else if (canWritePins) setDraft({ lat, lng, request: false })
          }}
        />

        {position && (
          <Marker position={position} icon={userIcon} interactive={false} keyboard={false} />
        )}

        <PrivacyArea pin={selected} />
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

      {canRequestPins && (
        <RequestPinButton
          active={placing}
          onToggle={() => {
            setSelectedId(null)
            setPlacing((p) => !p)
          }}
        />
      )}

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
          known={pins}
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
          request={draft.request}
          known={pins}
          onCancel={() => setDraft(null)}
          onSubmit={async ({ image, ...data }) => {
            const place = { lat: draft.lat, lng: draft.lng }
            if (draft.request) {
              if (!auth.userId) throw new Error(t('signInToRequest'))
              await requestPin(auth.userId, { ...place, ...data }, image)
              showToast(t('requestSent'))
            } else {
              const created = await addPin({ ...place, ...data }, image)
              // Whoever creates a pin answers for it until an admin changes that.
              if (created && auth.userId) await setPinContact(created.id, auth.userId).catch(() => {})
            }
            setDraft(null)
          }}
        />
      )}
    </div>
  )
}
