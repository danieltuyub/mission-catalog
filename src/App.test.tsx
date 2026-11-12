import { render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./components/MapView', () => ({ default: () => <div>map</div> }))

const getProjectById = vi.hoisted(() => vi.fn())
vi.mock('./services/projectService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./services/projectService')>()),
  getProjectById,
}))

afterEach(() => {
  window.location.hash = ''
})

describe('App', () => {
  it('shows the map by default with navbar and footer', () => {
    render(<App />)
    expect(screen.getByRole('main')).toHaveTextContent('map')
    expect(within(screen.getByRole('navigation', { name: 'Principal' })).getByRole('link', { name: 'Mapa' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Contáctanos' })).toHaveAttribute('href', '#/contacto')
  })

  it('shows the contact page for #/contacto', () => {
    window.location.hash = '#/contacto'
    render(<App />)
    expect(screen.getByRole('main')).toHaveTextContent('Contacto')
    expect(within(screen.getByRole('navigation', { name: 'Principal' })).getByRole('link', { name: 'Contacto' })).toHaveAttribute('aria-current', 'page')
  })

  it('shows the project detail for #/proyectos/<id> and keeps Proyectos active', async () => {
    getProjectById.mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Casa Norte',
      responsible: null,
      description: null,
      started_at: null,
      country: null,
      region: null,
      phone: null,
      mail: null,
      status: 'open',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    })
    window.location.hash = '#/proyectos/00000000-0000-0000-0000-000000000001'
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Casa Norte' })).toBeInTheDocument()
    expect(getProjectById).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000001')
    expect(
      within(screen.getByRole('navigation', { name: 'Principal' })).getByRole('link', { name: 'Proyectos' }),
    ).toHaveAttribute('aria-current', 'page')
  })
})
