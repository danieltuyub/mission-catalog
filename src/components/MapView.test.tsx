import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getAuthSnapshot } from '../services/authService'
import { requestPin } from '../services/pinRequests'
import { getToast } from '../services/toast'
import { ADMIN, SIGNED_OUT, SUBSCRIBER } from '../test/auth'

const map = vi.hoisted(() => ({
  click: null as null | ((e: { latlng: { lat: number; lng: number } }) => void),
  events: {} as Record<string, () => void>,
}))
const { addPin, editPin } = vi.hoisted(() => ({ addPin: vi.fn(), editPin: vi.fn() }))
const shown = vi.hoisted(() => ({ pins: [] as unknown[] }))
const leaflet = vi.hoisted(() => ({ setView: vi.fn(), zoom: 12, getZoom() { return this.zoom } }))

// Leaflet needs a real browser: replace the map with a div and capture the click handler.
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, className, ...options }: { children: React.ReactNode; className?: string; minZoom?: number; maxZoom?: number; zoom?: number; maxBounds?: number[][]; maxBoundsViscosity?: number }) => (
    <div
      data-testid="map"
      className={className}
      data-min-zoom={options.minZoom}
      data-max-zoom={options.maxZoom}
      data-zoom={options.zoom}
      data-bounds={JSON.stringify(options.maxBounds)}
      data-viscosity={options.maxBoundsViscosity}
    >
      {children}
    </div>
  ),
  TileLayer: () => null,
  Marker: () => null,
  Circle: ({ center, radius }: { center: number[]; radius: number }) => (
    <div data-testid="area" data-center={center.join(',')} data-radius={radius} />
  ),
  useMap: () => leaflet,
  useMapEvents: (handlers: { click?: typeof map.click } & Record<string, unknown>) => {
    if (handlers.click) map.click = handlers.click
    for (const name of ['zoomstart', 'zoomend']) if (typeof handlers[name] === 'function') map.events[name] = handlers[name] as () => void
    return {}
  },
}))
vi.mock('./LocateControl', () => ({ default: () => null }))
vi.mock('./TrackpadNavigation', () => ({ default: () => null }))
vi.mock('../hooks/useGeolocation', () => ({
  useGeolocation: () => ({ status: 'idle', position: null, locate: vi.fn() }),
}))
vi.mock('../hooks/usePins', () => ({ usePins: () => ({ pins: shown.pins, error: null, addPin, editPin }) }))
vi.mock('../services/pinRequests', () => ({ requestPin: vi.fn() }))
vi.mock('../services/mapViewStorage', () => ({ loadMapView: () => null, saveMapView: vi.fn() }))

import MapView from './MapView'

const clickMap = () => act(() => map.click?.({ latlng: { lat: 10, lng: 20 } }))

describe('MapView pin creation', () => {
  beforeEach(() => {
    addPin.mockReset().mockResolvedValue(undefined)
    vi.mocked(requestPin).mockReset().mockResolvedValue({} as never)
    map.click = null
  })

  it('lets admins create pins by clicking the map, with no request button', async () => {
    vi.mocked(getAuthSnapshot).mockReturnValue(ADMIN)
    render(<MapView />)
    expect(screen.queryByRole('button', { name: 'Solicitar pin' })).not.toBeInTheDocument()
    clickMap()
    expect(await screen.findByRole('dialog', { name: 'Nuevo pin' })).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Título'), 'Base')
    await userEvent.type(screen.getByLabelText('País'), 'México')
    await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'family')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(addPin).toHaveBeenCalledWith({ lat: 10, lng: 20, title: 'Base', description: '', country: 'México', region: '', city: '', kind: 'family', languages: [] }, undefined)
    expect(requestPin).not.toHaveBeenCalled()
  })

  it('offers nothing to guests', () => {
    vi.mocked(getAuthSnapshot).mockReturnValue(SIGNED_OUT)
    render(<MapView />)
    expect(screen.queryByRole('button', { name: 'Solicitar pin' })).not.toBeInTheDocument()
    clickMap()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  describe('as a subscriber', () => {
    beforeEach(() => vi.mocked(getAuthSnapshot).mockReturnValue(SUBSCRIBER))

    it('does not open the form from a plain map click', () => {
      render(<MapView />)
      clickMap()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('chooses a spot, files the request and confirms with a toast', async () => {
      render(<MapView />)
      await userEvent.click(screen.getByRole('button', { name: 'Solicitar pin' }))
      expect(screen.getByText('Toca el mapa para elegir la ubicación')).toBeInTheDocument()
      expect(screen.getByTestId('map').className).toContain('cursor-crosshair')

      clickMap()
      expect(await screen.findByRole('dialog', { name: 'Solicitar pin' })).toBeInTheDocument()
      // Choosing is over once the spot is picked.
      expect(screen.queryByText('Toca el mapa para elegir la ubicación')).not.toBeInTheDocument()

      await userEvent.type(screen.getByLabelText('Título'), 'Base')
      await userEvent.type(screen.getByLabelText('País'), 'México')
      await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'family')
      await userEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(requestPin).toHaveBeenCalledWith('sub-1', { lat: 10, lng: 20, title: 'Base', description: '', country: 'México', region: '', city: '', kind: 'family', languages: [] }, undefined)
      expect(addPin).not.toHaveBeenCalled()
      expect(getToast()?.message).toBe('Solicitud enviada. Un administrador la revisará.')
    })

    it('keeps the form open and shows why when the request fails', async () => {
      vi.mocked(requestPin).mockRejectedValue(new Error('Ya tienes 5 solicitudes pendientes.'))
      render(<MapView />)
      await userEvent.click(screen.getByRole('button', { name: 'Solicitar pin' }))
      clickMap()
      await userEvent.type(await screen.findByLabelText('Título'), 'Base')
      await userEvent.type(screen.getByLabelText('País'), 'México')
      await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'family')
      await userEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }))
      expect(await screen.findByText('Ya tienes 5 solicitudes pendientes.')).toBeInTheDocument()
      expect(screen.getByRole('dialog', { name: 'Solicitar pin' })).toBeInTheDocument()
      expect(getToast()).toBeNull()
    })

    it('cancels choosing with the button or Escape', async () => {
      render(<MapView />)
      await userEvent.click(screen.getByRole('button', { name: 'Solicitar pin' }))
      await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
      expect(screen.queryByText('Toca el mapa para elegir la ubicación')).not.toBeInTheDocument()
      clickMap()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: 'Solicitar pin' }))
      await userEvent.keyboard('{Escape}')
      expect(screen.queryByText('Toca el mapa para elegir la ubicación')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Solicitar pin' })).toBeInTheDocument()
    })
  })
})

describe('MapView zoom limits', () => {
  it('keeps streets out of reach and never shows the whole world, starting inside the limits', () => {
    render(<MapView />)
    const map = screen.getByTestId('map')
    expect(map).toHaveAttribute('data-min-zoom', '3')
    expect(map).toHaveAttribute('data-max-zoom', '14')
    expect(map).toHaveAttribute('data-zoom', '3')
    expect(map).toHaveAttribute('data-bounds', '[[-85,-180],[85,180]]')
    expect(map).toHaveAttribute('data-viscosity', '1')
  })
})

describe('MapView shared link', () => {
  const pin = {
    id: 'k1', title: 'Casa de Ana', description: 'Reunión', lat: 5, lng: 6, created_at: '2021-11-02T00:00:00Z', image_path: null,
    country: 'México', region: 'Yucatán', city: 'Mérida', languages: ['es', 'quc'], kind: 'house_church',
  }

  afterEach(() => {
    window.location.hash = ''
    shown.pins = []
  })

  it('opens the pin named in the link', async () => {
    shown.pins = [pin, { ...pin, id: 'k2', title: 'Otro' }]
    window.location.hash = '#/mapa?pin=k1'
    render(<MapView />)
    expect(await screen.findByRole('heading', { name: 'Casa de Ana' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Otro' })).not.toBeInTheDocument()
    expect(leaflet.setView).toHaveBeenCalledWith([5, 6], 13)
  })

  it('says so when the pin no longer exists', async () => {
    shown.pins = [pin]
    window.location.hash = '#/mapa?pin=gone'
    render(<MapView />)
    await waitFor(() => expect(getToast()?.message).toBe('No se encontró ese pin'))
  })

  it('draws the approximate area only around the selected pin, at half the old size', async () => {
    shown.pins = [pin, { ...pin, id: 'k2', lat: 7, lng: 8 }]
    window.location.hash = '#/mapa?pin=k2'
    render(<MapView />)
    const area = await screen.findByTestId('area')
    expect(screen.getAllByTestId('area')).toHaveLength(1)
    expect(area).toHaveAttribute('data-center', '7,8')
    expect(area).toHaveAttribute('data-radius', '1000')
  })

  it('draws no area while no pin is selected', () => {
    shown.pins = [pin, { ...pin, id: 'k2', lat: 7, lng: 8 }]
    window.location.hash = '#/mapa'
    render(<MapView />)
    expect(screen.queryByTestId('area')).not.toBeInTheDocument()
  })

  describe('approximate area', () => {
    beforeEach(() => {
      shown.pins = [pin]
      window.location.hash = '#/mapa?pin=k1'
      leaflet.zoom = 12
    })
    afterEach(() => {
      leaflet.zoom = 12
    })

    it('is not drawn on a far-away map, where it would be smaller than a pixel', () => {
      leaflet.zoom = 6
      render(<MapView />)
      expect(screen.getByRole('heading', { name: 'Casa de Ana' })).toBeInTheDocument()
      expect(screen.queryByTestId('area')).not.toBeInTheDocument()
    })

    it('is not drawn while the map zooms (the browser would blow it up as a blurry blob) and comes back after', () => {
      render(<MapView />)
      expect(screen.getByTestId('area')).toBeInTheDocument()
      act(() => map.events.zoomstart())
      expect(screen.queryByTestId('area')).not.toBeInTheDocument()
      act(() => map.events.zoomend())
      expect(screen.getByTestId('area')).toBeInTheDocument()
    })

    it('appears once the zoom gets close enough', () => {
      leaflet.zoom = 6
      render(<MapView />)
      act(() => {
        leaflet.zoom = 11
        map.events.zoomstart()
        map.events.zoomend()
      })
      expect(screen.getByTestId('area')).toBeInTheDocument()
    })
  })

  it('opens nothing without a link', () => {
    shown.pins = [pin]
    window.location.hash = '#/mapa'
    render(<MapView />)
    expect(screen.queryByRole('heading', { name: 'Casa de Ana' })).not.toBeInTheDocument()
  })
})
