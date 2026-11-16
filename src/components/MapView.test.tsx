import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAuthSnapshot } from '../services/authService'
import { requestPin } from '../services/pinRequests'
import { getToast } from '../services/toast'
import { ADMIN, SIGNED_OUT, SUBSCRIBER } from '../test/auth'

const map = vi.hoisted(() => ({ click: null as null | ((e: { latlng: { lat: number; lng: number } }) => void) }))
const { addPin, editPin } = vi.hoisted(() => ({ addPin: vi.fn(), editPin: vi.fn() }))

// Leaflet needs a real browser: replace the map with a div and capture the click handler.
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="map" className={className}>
      {children}
    </div>
  ),
  TileLayer: () => null,
  Marker: () => null,
  useMap: () => ({}),
  useMapEvents: (handlers: { click?: typeof map.click }) => {
    if (handlers.click) map.click = handlers.click
    return {}
  },
}))
vi.mock('./LocateControl', () => ({ default: () => null }))
vi.mock('./TrackpadNavigation', () => ({ default: () => null }))
vi.mock('../hooks/useGeolocation', () => ({
  useGeolocation: () => ({ status: 'idle', position: null, locate: vi.fn() }),
}))
vi.mock('../hooks/usePins', () => ({ usePins: () => ({ pins: [], error: null, addPin, editPin }) }))
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
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(addPin).toHaveBeenCalledWith({ lat: 10, lng: 20, title: 'Base', description: '' }, undefined)
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
      await userEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(requestPin).toHaveBeenCalledWith('sub-1', { lat: 10, lng: 20, title: 'Base', description: '' }, undefined)
      expect(addPin).not.toHaveBeenCalled()
      expect(getToast()?.message).toBe('Solicitud enviada. Un administrador la revisará.')
    })

    it('keeps the form open and shows why when the request fails', async () => {
      vi.mocked(requestPin).mockRejectedValue(new Error('Ya tienes 5 solicitudes pendientes.'))
      render(<MapView />)
      await userEvent.click(screen.getByRole('button', { name: 'Solicitar pin' }))
      clickMap()
      await userEvent.type(await screen.findByLabelText('Título'), 'Base')
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
