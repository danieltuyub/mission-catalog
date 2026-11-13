import { render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAuthSnapshot } from './services/authService'
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

  it('shows the login without navbar or footer', () => {
    window.location.hash = '#/login'
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Acceso' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Principal' })).not.toBeInTheDocument()
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Volver al mapa/ })).toHaveAttribute('href', '#/mapa')
  })

  it('matches the login route even with a query string', () => {
    window.location.hash = '#/login?next=%2Fproyectos'
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Acceso' })).toBeInTheDocument()
  })

  describe('#/proyectos/nuevo', () => {
    afterEach(() => {
      vi.mocked(getAuthSnapshot).mockReturnValue({ loading: false, email: null, isAdmin: false })
    })

    it('sends signed-out visitors to the login', () => {
      window.location.hash = '#/proyectos/nuevo'
      render(<App />)
      expect(screen.queryByRole('form', { name: 'Nuevo proyecto' })).not.toBeInTheDocument()
      expect(window.location.hash).toBe('#/login?next=%2Fproyectos%2Fnuevo')
    })

    it('guards the edit route and does not show the detail for it', () => {
      getProjectById.mockClear()
      window.location.hash = '#/proyectos/00000000-0000-0000-0000-000000000001/editar'
      render(<App />)
      expect(getProjectById).not.toHaveBeenCalled()
      expect(window.location.hash).toBe(
        '#/login?next=%2Fproyectos%2F00000000-0000-0000-0000-000000000001%2Feditar',
      )
    })

    it('shows the edit form to admins, loaded from the project', async () => {
      vi.mocked(getAuthSnapshot).mockReturnValue({ loading: false, email: 'a@b.com', isAdmin: true })
      getProjectById.mockResolvedValue({
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Casa Norte',
        status: 'open',
      })
      window.location.hash = '#/proyectos/00000000-0000-0000-0000-000000000001/editar'
      render(<App />)
      expect(await screen.findByRole('form', { name: 'Editar proyecto' })).toBeInTheDocument()
      expect(screen.getByLabelText('Nombre *')).toHaveValue('Casa Norte')
    })

    it('shows the form to admins and does not treat "nuevo" as a project id', () => {
      vi.mocked(getAuthSnapshot).mockReturnValue({ loading: false, email: 'a@b.com', isAdmin: true })
      window.location.hash = '#/proyectos/nuevo'
      render(<App />)
      expect(screen.getByRole('heading', { name: 'Nuevo proyecto' })).toBeInTheDocument()
      expect(screen.getByRole('form', { name: 'Nuevo proyecto' })).toBeInTheDocument()
    })
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
