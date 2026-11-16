import { render, screen, within } from '@testing-library/react'
import { ADMIN, CREATOR, SIGNED_OUT, SUBSCRIBER } from './test/auth'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAuthSnapshot } from './services/authService'
import App from './App'

vi.mock('./components/MapView', () => ({ default: () => <div>map</div> }))
vi.mock('./services/accountService', () => ({
  getProfile: vi.fn().mockResolvedValue({ first_name: 'Ana', last_name: '' }),
  MIN_PASSWORD_LENGTH: 8,
}))

vi.mock('./services/pinRequests', () => ({
  countPendingRequests: vi.fn().mockResolvedValue(0),
  listRequestsPage: vi.fn().mockResolvedValue({ requests: [], total: 0 }),
  countReviewedRequests: vi.fn().mockResolvedValue(0),
  REVIEW_PAGE_SIZE: 10,
}))

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
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Principal' })).not.toBeInTheDocument()
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Volver al mapa/ })).toHaveAttribute('href', '#/mapa')
  })

  it('matches the login route even with a query string', () => {
    window.location.hash = '#/login?next=%2Fproyectos'
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
  })

  describe('#/cuenta', () => {
    afterEach(() => {
      vi.mocked(getAuthSnapshot).mockReturnValue(SIGNED_OUT)
    })

    it('sends signed-out visitors to the login', () => {
      window.location.hash = '#/cuenta/mensajes'
      render(<App />)
      expect(screen.queryByRole('heading', { name: 'Mi espacio' })).not.toBeInTheDocument()
      expect(window.location.hash).toBe('#/login?next=%2Fcuenta%2Fmensajes')
    })

    it('keeps the navbar and marks the avatar as active', () => {
      vi.mocked(getAuthSnapshot).mockReturnValue(SUBSCRIBER)
      window.location.hash = '#/cuenta/perfil'
      render(<App />)
      const nav = within(screen.getByRole('navigation', { name: 'Principal' }))
      expect(nav.getByRole('link', { name: 'Proyectos' })).toBeInTheDocument()
      expect(nav.getByRole('button', { name: /Menú de usuario/ })).toHaveClass('ring-2')
    })
  })

  describe('#/admin', () => {
    afterEach(() => {
      vi.mocked(getAuthSnapshot).mockReturnValue(SIGNED_OUT)
    })

    it('sends signed-out visitors to the login', () => {
      window.location.hash = '#/admin'
      render(<App />)
      expect(screen.queryByRole('heading', { name: 'Administración' })).not.toBeInTheDocument()
      expect(window.location.hash).toBe('#/login?next=%2Fadmin')
    })

    it('is not for members', () => {
      vi.mocked(getAuthSnapshot).mockReturnValue(SUBSCRIBER)
      window.location.hash = '#/admin'
      render(<App />)
      expect(screen.queryByRole('heading', { name: 'Administración' })).not.toBeInTheDocument()
      expect(screen.getByRole('alert')).toHaveTextContent('No tienes permiso')
    })

    it('shows the panel to admins on its first section, with their own space within reach', async () => {
      vi.mocked(getAuthSnapshot).mockReturnValue(ADMIN)
      window.location.hash = '#/admin'
      render(<App />)
      expect(await screen.findByRole('heading', { name: 'Administración' })).toBeInTheDocument()
      expect(window.location.hash).toBe('#/admin/solicitudes')
      expect(screen.getByRole('link', { name: 'Mi espacio' })).toHaveAttribute('href', '#/cuenta')
    })
  })

  describe('#/proyectos/nuevo', () => {
    afterEach(() => {
      vi.mocked(getAuthSnapshot).mockReturnValue(SIGNED_OUT)
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

    it('matches the edit route with a ?from query', async () => {
      vi.mocked(getAuthSnapshot).mockReturnValue(ADMIN)
      getProjectById.mockResolvedValue({ id: '00000000-0000-0000-0000-000000000001', name: 'Casa Norte', status: 'open' })
      window.location.hash = '#/proyectos/00000000-0000-0000-0000-000000000001/editar?from=lista'
      render(<App />)
      expect(await screen.findByRole('form', { name: 'Editar proyecto' })).toBeInTheDocument()
    })

    it('shows the edit form to admins, loaded from the project', async () => {
      vi.mocked(getAuthSnapshot).mockReturnValue(ADMIN)
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

    it('lets a creator open the create form but not a subscriber', () => {
      vi.mocked(getAuthSnapshot).mockReturnValue(CREATOR)
      window.location.hash = '#/proyectos/nuevo'
      const { unmount } = render(<App />)
      expect(screen.getByRole('form', { name: 'Nuevo proyecto' })).toBeInTheDocument()
      unmount()

      vi.mocked(getAuthSnapshot).mockReturnValue(SUBSCRIBER)
      render(<App />)
      expect(screen.queryByRole('form')).not.toBeInTheDocument()
      expect(screen.getByRole('alert')).toHaveTextContent('No tienes permiso')
    })

    it('shows the form to admins and does not treat "nuevo" as a project id', () => {
      vi.mocked(getAuthSnapshot).mockReturnValue(ADMIN)
      window.location.hash = '#/proyectos/nuevo'
      render(<App />)
      expect(screen.getByRole('heading', { name: 'Nuevo proyecto' })).toBeInTheDocument()
      expect(screen.getByRole('form', { name: 'Nuevo proyecto' })).toBeInTheDocument()
    })
  })

  it('shows the account page to a signed-in user', async () => {
    vi.mocked(getAuthSnapshot).mockReturnValue(SUBSCRIBER)
    window.location.hash = '#/cuenta/perfil'
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Mi espacio' })).toBeInTheDocument()
    expect(await screen.findByLabelText('Nombre')).toBeInTheDocument()
    vi.mocked(getAuthSnapshot).mockReturnValue(SIGNED_OUT)
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
    expect(getProjectById).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000001', false)
    expect(
      within(screen.getByRole('navigation', { name: 'Principal' })).getByRole('link', { name: 'Proyectos' }),
    ).toHaveAttribute('aria-current', 'page')
  })
})
