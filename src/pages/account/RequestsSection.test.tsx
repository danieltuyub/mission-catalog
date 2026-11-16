import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const svc = vi.hoisted(() => ({ listMyRequests: vi.fn(), requestImageUrl: vi.fn() }))
vi.mock('../../services/pinRequests', () => ({ ...svc, MAX_PENDING_REQUESTS: 5 }))

import { getAuthSnapshot } from '../../services/authService'
import { SIGNED_OUT, SUBSCRIBER } from '../../test/auth'
import RequestsSection from './RequestsSection'

const request = (over: object) => ({
  id: 'r1',
  requested_by: 'sub-1',
  title: 'Pozo nuevo',
  description: 'Cerca de la escuela',
  lat: 14.6349,
  lng: -90.5069,
  image_path: null,
  status: 'pending',
  created_at: '2026-11-10T12:00:00Z',
  ...over,
})

beforeEach(() => {
  vi.mocked(getAuthSnapshot).mockReturnValue(SUBSCRIBER)
  svc.listMyRequests.mockReset().mockResolvedValue([])
  svc.requestImageUrl.mockReset().mockResolvedValue('https://signed/img.webp')
})
afterEach(() => vi.mocked(getAuthSnapshot).mockReturnValue(SIGNED_OUT))

describe('RequestsSection', () => {
  it('asks only for the user’s own requests', async () => {
    render(<RequestsSection />)
    await screen.findByText(/Aún no has enviado/)
    expect(svc.listMyRequests).toHaveBeenCalledWith('sub-1')
  })

  it('points to the map when there are none', async () => {
    render(<RequestsSection />)
    expect(await screen.findByRole('link', { name: 'Ir al mapa' })).toHaveAttribute('href', '#/mapa')
  })

  it('lists each request with its status and the pending count', async () => {
    svc.listMyRequests.mockResolvedValue([
      request({}),
      request({ id: 'r2', title: 'Escuela', status: 'approved' }),
      request({ id: 'r3', title: 'Puente', status: 'rejected' }),
    ])
    render(<RequestsSection />)
    expect(await screen.findByText('Pozo nuevo')).toBeInTheDocument()
    expect(screen.getByText('Pendiente')).toBeInTheDocument()
    expect(screen.getByText('Aprobada')).toBeInTheDocument()
    expect(screen.getByText('Rechazada')).toBeInTheDocument()
    expect(screen.getByText('1 de 5 solicitudes pendientes')).toBeInTheDocument()
  })

  it('loads the private image only when the request has one', async () => {
    svc.listMyRequests.mockResolvedValue([request({ image_path: 'sub-1/a.webp' }), request({ id: 'r2' })])
    render(<RequestsSection />)
    await screen.findAllByText('Pozo nuevo')
    expect(svc.requestImageUrl).toHaveBeenCalledTimes(1)
    expect(svc.requestImageUrl).toHaveBeenCalledWith('sub-1/a.webp')
  })

  it('shows the error when they cannot be loaded', async () => {
    svc.listMyRequests.mockRejectedValue(new Error('No se pudieron cargar tus solicitudes. Inténtalo de nuevo.'))
    render(<RequestsSection />)
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar tus solicitudes')
  })
})
