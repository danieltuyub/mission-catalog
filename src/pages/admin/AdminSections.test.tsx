import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const svc = vi.hoisted(() => ({
  listUsers: vi.fn(),
  setUserRole: vi.fn(),
  setUserBan: vi.fn(),
  setUserLanguage: vi.fn(),
  updateUserName: vi.fn(),
  createUser: vi.fn(),
  listRequestsPage: vi.fn(),
  countPendingRequests: vi.fn(),
  countReviewedRequests: vi.fn(),
  approveRequest: vi.fn(),
  rejectRequest: vi.fn(),
  requestImageUrl: vi.fn(),
  listAdminProjects: vi.fn(),
  deleteProjectWithImages: vi.fn(),
  getPins: vi.fn(),
  updatePin: vi.fn(),
  deletePin: vi.fn(),
  listAllConversations: vi.fn(),
  listPinContacts: vi.fn(),
  listPinLocations: vi.fn(),
  setPinContact: vi.fn(),
  updatePinWithImage: vi.fn(),
  listThread: vi.fn(),
  updateProjectWithImages: vi.fn(),
  createProjectWithImages: vi.fn(),
  getProjectById: vi.fn(),
}))

vi.mock('../../services/contactMessages', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/contactMessages')>()),
  listContactMessages: vi.fn(),
  setContactRead: vi.fn(),
  subscribeToContacts: vi.fn(() => () => {}),
}))
vi.mock('../../services/auditLog', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/auditLog')>()),
  listAuditLog: vi.fn(),
}))
vi.mock('../../services/adminUsers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/adminUsers')>()),
  listUsers: svc.listUsers,
  setUserRole: svc.setUserRole,
  setUserBan: svc.setUserBan,
  setUserLanguage: svc.setUserLanguage,
  updateUserName: svc.updateUserName,
  createUser: svc.createUser,
}))
vi.mock('../../services/pinRequests', () => ({
  listRequestsPage: svc.listRequestsPage,
  countPendingRequests: svc.countPendingRequests,
  countReviewedRequests: svc.countReviewedRequests,
  REVIEW_PAGE_SIZE: 10,
  approveRequest: svc.approveRequest,
  rejectRequest: svc.rejectRequest,
  requestImageUrl: svc.requestImageUrl,
  listMyRequests: vi.fn(),
  MAX_PENDING_REQUESTS: 5,
}))
vi.mock('../../services/projectAdmin', () => ({
  listAdminProjects: svc.listAdminProjects,
  deleteProjectWithImages: svc.deleteProjectWithImages,
  updateProjectWithImages: svc.updateProjectWithImages,
  createProjectWithImages: svc.createProjectWithImages,
}))
vi.mock('../../services/projectService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/projectService')>()),
  getProjectById: svc.getProjectById,
}))
vi.mock('../../services/pinService', () => ({
  getPins: svc.getPins,
  updatePin: svc.updatePin,
  deletePin: svc.deletePin,
  pinImageUrl: (p: string) => `https://img/${p}`,
}))
vi.mock('../../services/pinContacts', () => ({
  listPinContacts: svc.listPinContacts,
  setPinContact: svc.setPinContact,
}))
vi.mock('../../services/pinLocations', () => ({ listPinLocations: svc.listPinLocations }))
// Leaflet needs a real browser: a stand-in that lists what the map would draw.
vi.mock('../../components/AdminPinsMap', () => ({
  default: ({ pins, selectedId, onSelect, visible }: { pins: { id: string; position: number[] }[]; selectedId: string | null; onSelect: (id: string) => void; visible: boolean }) => (
    <div data-testid="map" data-visible={String(visible)} data-selected={selectedId ?? ''}>
      {pins.map((p) => (
        <button key={p.id} data-testid={`marker-${p.id}`} onClick={() => onSelect(p.id)}>
          {p.position.join(',')}
        </button>
      ))}
    </div>
  ),
}))
vi.mock('../../services/pinEdit', () => ({ updatePinWithImage: svc.updatePinWithImage }))
vi.mock('../../services/messages', () => ({
  listAllConversations: svc.listAllConversations,
  listThread: svc.listThread,
}))

import { DEFAULT_ADMIN_SORT, saveAdminPageSize, saveAdminSort } from '../../services/adminProjectsView'
import { getAuthSnapshot } from '../../services/authService'
import { getToast } from '../../services/toast'
import { ADMIN } from '../../test/auth'
import AuditSection from './AuditSection'
import ContactInboxSection from './ContactInboxSection'
import ModerationSection from './ModerationSection'
import { listAuditLog } from '../../services/auditLog'
import { listContactMessages, setContactRead } from '../../services/contactMessages'
import PinRequestsSection from './PinRequestsSection'
import PinsSection from './PinsSection'
import ProjectsAdminSection from './ProjectsAdminSection'
import UsersSection from './UsersSection'

const user = (over: object) => ({
  id: 'u1',
  email: 'ana@x.com',
  firstName: 'Ana',
  lastName: 'Paz',
  role: 'subscriber',
  createdAt: '2026-01-01T00:00:00Z',
  lastSignInAt: null,
  bannedUntil: null,
  language: null,
  ...over,
})
const USERS = [user({}), user({ id: 'u2', email: 'leo@x.com', firstName: 'Leo', lastName: '', role: 'creator' }), user({ id: 'admin-1', email: 'a@b.com', firstName: 'Yo', lastName: '', role: 'admin' })]

beforeEach(() => {
  vi.mocked(getAuthSnapshot).mockReturnValue(ADMIN)
  for (const fn of Object.values(svc)) fn.mockReset()
  svc.listUsers.mockResolvedValue(USERS)
  svc.requestImageUrl.mockResolvedValue('https://signed')
  svc.getPins.mockResolvedValue([])
  svc.listPinContacts.mockResolvedValue(new Map())
  svc.listPinLocations.mockResolvedValue(new Map())
  saveAdminSort(DEFAULT_ADMIN_SORT)
  saveAdminPageSize(10)
  window.location.hash = '#/admin/proyectos'
})

describe('UsersSection new user', () => {
  it('opens the form from the button, and reloads the list once the user is created', async () => {
    render(<UsersSection />)
    await userEvent.click(await screen.findByRole('button', { name: 'Nuevo usuario' }))
    expect(screen.getByRole('form', { name: 'Nuevo usuario' })).toBeInTheDocument()
    svc.createUser.mockResolvedValue('u9')
    await userEvent.type(screen.getByLabelText('Correo'), 'nuevo@x.com')
    await userEvent.click(screen.getByRole('button', { name: 'Crear usuario' }))
    expect(await screen.findByRole('region', { name: 'Usuario creado' })).toBeInTheDocument()
    expect(svc.listUsers).toHaveBeenCalledTimes(2)
    await userEvent.click(screen.getByRole('button', { name: 'Listo' }))
    // It leaves with a transition, then goes away, and focus returns to the button that opened it.
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Usuario creado' })).not.toBeInTheDocument())
    await waitFor(() => expect(screen.getByRole('button', { name: 'Nuevo usuario' })).toHaveFocus())
  })
})

describe('UsersSection', () => {
  it('shows the role as text and changes it from the edit form', async () => {
    svc.setUserRole.mockResolvedValue(undefined)
    render(<UsersSection />)
    await screen.findByText('Ana Paz')
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Editar a Ana Paz' }))
    const form = await screen.findByRole('form', { name: 'Editar a ana@x.com' })
    await userEvent.selectOptions(within(form).getByRole('combobox', { name: 'Rol' }), 'creator')
    await userEvent.click(within(form).getByRole('button', { name: 'Guardar' }))
    expect(svc.setUserRole).toHaveBeenCalledWith('u1', 'creator')
    expect(svc.updateUserName).not.toHaveBeenCalled()
    await waitFor(() => expect(getToast()?.message).toBe('Usuario actualizado'))
    expect(svc.listUsers).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(screen.queryByRole('form', { name: 'Editar a ana@x.com' })).not.toBeInTheDocument())
  })

  it('does not let an admin change their own role', async () => {
    render(<UsersSection />)
    await userEvent.click(await screen.findByRole('button', { name: 'Editar a Yo' }))
    expect(await screen.findByRole('combobox', { name: 'Rol' })).toBeDisabled()
  })

  it('edits a name', async () => {
    svc.updateUserName.mockResolvedValue(undefined)
    render(<UsersSection />)
    await userEvent.click(await screen.findByRole('button', { name: 'Editar a Ana Paz' }))
    const form = await screen.findByRole('form', { name: 'Editar a ana@x.com' })
    const first = within(form).getByLabelText('Nombre')
    await userEvent.clear(first)
    await userEvent.type(first, 'Anita')
    await userEvent.click(within(form).getByRole('button', { name: 'Guardar' }))
    expect(svc.updateUserName).toHaveBeenCalledWith('u1', 'Anita', 'Paz')
    expect(svc.setUserRole).not.toHaveBeenCalled()
  })

  it('blocks an account indefinitely, and only calls what changed', async () => {
    svc.setUserBan.mockResolvedValue(undefined)
    render(<UsersSection />)
    await userEvent.click(await screen.findByRole('button', { name: 'Editar a Ana Paz' }))
    const form = await screen.findByRole('form', { name: 'Editar a ana@x.com' })
    await userEvent.selectOptions(within(form).getByRole('combobox', { name: 'Acceso' }), 'forever')
    await userEvent.click(within(form).getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(svc.setUserBan).toHaveBeenCalledWith('u1', new Date('2999-01-01T00:00:00Z')))
    expect(svc.setUserRole).not.toHaveBeenCalled()
  })

  it('shows blocked accounts and lifts the block', async () => {
    svc.setUserBan.mockResolvedValue(undefined)
    svc.listUsers.mockResolvedValue([user({ bannedUntil: '2999-01-01T00:00:00Z' })])
    render(<UsersSection />)
    expect(await screen.findByText('Bloqueado indefinidamente')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Editar a Ana Paz' }))
    const access = await screen.findByRole('combobox', { name: 'Acceso' })
    expect(access).toHaveValue('keep')
    await userEvent.selectOptions(access, 'none')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(svc.setUserBan).toHaveBeenCalledWith('u1', null))
  })

  it('sets a user\'s preferred language, and clears it', async () => {
    svc.setUserLanguage.mockResolvedValue(undefined)
    svc.listUsers.mockResolvedValue([user({ language: 'es' })])
    render(<UsersSection />)
    await userEvent.click(await screen.findByRole('button', { name: 'Editar a Ana Paz' }))
    const language = await screen.findByRole('combobox', { name: 'Idioma' })
    expect(language).toHaveValue('es')
    await userEvent.selectOptions(language, 'en')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(svc.setUserLanguage).toHaveBeenCalledWith('u1', 'en'))
    expect(svc.setUserRole).not.toHaveBeenCalled()
  })

  it('does not let an admin block their own account', async () => {
    render(<UsersSection />)
    await userEvent.click(await screen.findByRole('button', { name: 'Editar a Yo' }))
    expect(await screen.findByRole('combobox', { name: 'Acceso' })).toBeDisabled()
  })

  it('filters by name or email', async () => {
    render(<UsersSection />)
    await screen.findByText('Ana Paz')
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar usuario' }), 'leo@')
    expect(screen.queryByText('Ana Paz')).not.toBeInTheDocument()
    expect(screen.getByText('Leo')).toBeInTheDocument()
  })
})

const request = (over: object) => ({
  id: 'r1',
  requested_by: 'u1',
  title: 'Pozo nuevo',
  description: '',
  lat: 1,
  lng: 2,
  country: 'México',
  region: 'Yucatán',
  city: 'Mérida',
  languages: ['es'],
  kind: 'family',
  image_path: null,
  status: 'pending',
  created_at: '2026-11-10T12:00:00Z',
  ...over,
})

describe('PinRequestsSection', () => {
  // The server splits by status: a stateful fake so a review moves a request between the lists.
  let rows: ReturnType<typeof request>[]
  beforeEach(() => {
    rows = [request({}), request({ id: 'r2', title: 'Viejo', status: 'approved' })]
    svc.listRequestsPage.mockImplementation(async (filter: string) => {
      const list = rows.filter((r) => (filter === 'pending') === (r.status === 'pending'))
      return { requests: list, total: list.length }
    })
    svc.countPendingRequests.mockImplementation(async () => rows.filter((r) => r.status === 'pending').length)
    svc.countReviewedRequests.mockImplementation(async () => rows.filter((r) => r.status !== 'pending').length)
  })

  it('shows pending requests first, with who asked and the counts', async () => {
    render(<PinRequestsSection />)
    expect(await screen.findByText('Pozo nuevo')).toBeInTheDocument()
    expect(screen.queryByText('Viejo')).not.toBeInTheDocument()
    expect(await screen.findByText(/Ana Paz/)).toBeInTheDocument()
    expect(svc.listRequestsPage).toHaveBeenCalledWith('pending', 1)
    expect(screen.getByRole('button', { name: /Revisadas/ })).toHaveTextContent('1')
  })

  it('approves and moves it to the reviewed ones', async () => {
    svc.approveRequest.mockImplementation(async (r: { id: string }) => {
      rows = rows.map((x) => (x.id === r.id ? { ...x, status: 'approved' } : x))
    })
    render(<PinRequestsSection />)
    await userEvent.click(await screen.findByRole('button', { name: 'Aprobar' }))
    expect(svc.approveRequest).toHaveBeenCalledWith(expect.objectContaining({ id: 'r1' }), { country: 'México', region: 'Yucatán', city: 'Mérida', kind: 'family', languages: ['es'] })
    expect(getToast()?.message).toBe('Pin publicado en el mapa')
    expect(await screen.findByText('No hay solicitudes pendientes.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Revisadas/ }))
    expect(await screen.findByText('Pozo nuevo')).toBeInTheDocument()
    expect(svc.listRequestsPage).toHaveBeenCalledWith('reviewed', 1)
  })

  it('lets the reviewer fix the place before approving, keeping the spelling in use', async () => {
    svc.getPins.mockResolvedValue([{ country: 'Guatemala', region: 'Sacatepéquez', city: 'Antigua' }])
    svc.approveRequest.mockResolvedValue(undefined)
    render(<PinRequestsSection />)
    const country = await screen.findByLabelText('País')
    await userEvent.clear(country)
    await userEvent.type(country, 'guatemala')
    await userEvent.clear(screen.getByLabelText('Estado o región'))
    await userEvent.clear(screen.getByLabelText('Ciudad'))
    await userEvent.type(screen.getByLabelText('Ciudad'), 'antigua')
    await userEvent.click(screen.getByRole('button', { name: 'Aprobar' }))
    expect(svc.approveRequest).toHaveBeenCalledWith(expect.anything(), { country: 'Guatemala', region: '', city: 'Antigua', kind: 'family', languages: ['es'] })
  })

  it('lets the reviewer settle the type and languages, and needs a type', async () => {
    rows = [request({ kind: null, languages: [] })]
    svc.approveRequest.mockResolvedValue(undefined)
    render(<PinRequestsSection />)
    const approve = await screen.findByRole('button', { name: 'Aprobar' })
    expect(approve).toBeDisabled()
    await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'church')
    const search = screen.getByLabelText('Idiomas')
    await userEvent.type(search, 'quec')
    await userEvent.click(screen.getByRole('option', { name: 'Quechua' }))
    await userEvent.click(approve)
    expect(svc.approveRequest).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ kind: 'church', languages: ['qu'] }))
  })

  it('cannot approve without a country', async () => {
    render(<PinRequestsSection />)
    await userEvent.clear(await screen.findByLabelText('País'))
    expect(screen.getByRole('button', { name: 'Aprobar' })).toBeDisabled()
  })

  it('pages the reviewed ones on the server', async () => {
    svc.listRequestsPage.mockImplementation(async (_f: string, page: number) => ({
      requests: [request({ id: `p${page}`, title: `Revisada ${page}`, status: 'approved' })],
      total: 25,
    }))
    svc.countPendingRequests.mockResolvedValue(0)
    svc.countReviewedRequests.mockResolvedValue(25)
    render(<PinRequestsSection />)
    await userEvent.click(await screen.findByRole('button', { name: /Revisadas/ }))
    expect(await screen.findByText('Revisada 1')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
    expect(await screen.findByText('Revisada 2')).toBeInTheDocument()
    expect(svc.listRequestsPage).toHaveBeenLastCalledWith('reviewed', 2)
  })

  it('asks before rejecting', async () => {
    svc.rejectRequest.mockResolvedValue(undefined)
    render(<PinRequestsSection />)
    await userEvent.click(await screen.findByRole('button', { name: 'Rechazar' }))
    expect(svc.rejectRequest).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Sí, rechazar' }))
    expect(svc.rejectRequest).toHaveBeenCalledWith('r1')
  })

  it('reports a failure and reloads what is true now', async () => {
    svc.approveRequest.mockRejectedValue(new Error('Esta solicitud ya fue revisada.'))
    render(<PinRequestsSection />)
    await userEvent.click(await screen.findByRole('button', { name: 'Aprobar' }))
    expect(getToast()?.message).toBe('Esta solicitud ya fue revisada.')
    await vi.waitFor(() => expect(svc.listRequestsPage).toHaveBeenCalledTimes(2))
  })
})

describe('ProjectsAdminSection', () => {
  const project = (over: object) => ({ id: 'p1', name: 'Casa Azul', status: 'open', country: 'México', region: 'Yucatán', created_by: null, updated_at: 'x', ...over })

  beforeEach(() => {
    svc.listAdminProjects.mockResolvedValue([project({}), project({ id: 'p2', name: 'Escuela', created_by: 'u2' })])
  })

  it('links each project with the admin origin', async () => {
    render(<ProjectsAdminSection />)
    expect(await screen.findByRole('link', { name: 'Casa Azul' })).toHaveAttribute('href', '#/proyectos/p1?from=admin')
    // Editing opens over the list instead of leaving it.
    expect(screen.getAllByRole('link', { name: 'Editar' })[0]).toHaveAttribute('href', '#/admin/proyectos?editar=p1')
  })

  describe('order and page size', () => {
    const many = Array.from({ length: 12 }, (_, i) => project({ id: `p${i}`, name: `Proyecto ${String(i).padStart(2, '0')}`, country: i % 2 ? 'México' : 'Chile', created_by: i === 0 ? 'u2' : null }))
    const names = () => screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)

    it('lists by name and sorts by a column, in both directions', async () => {
      svc.listAdminProjects.mockResolvedValue([project({ id: 'a', name: 'Beta', country: 'Chile' }), project({ id: 'b', name: 'Alfa', country: 'México' }), project({ id: 'c', name: 'Gama', country: 'Argentina', region: '' })])
      render(<ProjectsAdminSection />)
      await screen.findByText('Alfa')
      expect(names()).toEqual(['Alfa', 'Beta', 'Gama'])
      await userEvent.click(screen.getByRole('button', { name: /^Ordenar por Proyecto/ }))
      expect(names()).toEqual(['Gama', 'Beta', 'Alfa'])
      await userEvent.click(screen.getByRole('button', { name: /^Ordenar por Lugar/ }))
      // By place: Argentina, then "Yucatán, Chile" and "Yucatán, México".
      expect(names()).toEqual(['Gama', 'Beta', 'Alfa'])
    })

    it('shows the status as text in its own column and sorts by it', async () => {
      svc.listAdminProjects.mockResolvedValue([project({ id: 'a', name: 'Beta', status: 'paused' }), project({ id: 'b', name: 'Alfa', status: 'closed' }), project({ id: 'c', name: 'Gama', status: 'open' })])
      render(<ProjectsAdminSection />)
      await screen.findByText('Alfa')
      expect(screen.getByText('Cerrado')).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: /^Ordenar por Estado/ }))
      // Abierto, Cerrado, Pausado.
      expect(names()).toEqual(['Gama', 'Alfa', 'Beta'])
    })

    it('goes back to the first page when the order changes', async () => {
      svc.listAdminProjects.mockResolvedValue(many)
      render(<ProjectsAdminSection />)
      await screen.findByText('Proyecto 00')
      await userEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
      expect(names()).toEqual(['Proyecto 10', 'Proyecto 11'])
      await userEvent.click(screen.getByRole('button', { name: /^Ordenar por Proyecto/ }))
      expect(names()[0]).toBe('Proyecto 11')
    })

    it('changes the page size and keeps it', async () => {
      svc.listAdminProjects.mockResolvedValue(many)
      const { unmount } = render(<ProjectsAdminSection />)
      await screen.findByText('Proyecto 00')
      expect(names()).toHaveLength(10)
      await userEvent.selectOptions(screen.getByLabelText('Proyectos por página'), '25')
      expect(names()).toHaveLength(12)
      unmount()
      render(<ProjectsAdminSection />)
      await screen.findByText('Proyecto 00')
      expect(screen.getByLabelText('Proyectos por página')).toHaveValue('25')
    })
  })

  describe('edit over the list', () => {
    const full = { id: 'p1', name: 'Casa Azul', status: 'open', country: 'México', region: 'Yucatán', created_by: 'u2', created_at: 'x', updated_at: '2026-02-01T00:00:00Z', project_images: [] }

    it('opens the form over the list when the URL asks for it, without reading the list again', async () => {
      svc.getProjectById.mockResolvedValue(full)
      window.location.hash = '#/admin/proyectos?editar=p1'
      render(<ProjectsAdminSection />)
      expect(await screen.findByRole('dialog', { name: 'Editar proyecto' })).toBeInTheDocument()
      expect(screen.getByText('Escuela')).toBeInTheDocument()
      expect(svc.listAdminProjects).toHaveBeenCalledTimes(1)
    })

    it('opens the form without waiting for the list (a link opened in a new tab)', async () => {
      svc.getProjectById.mockResolvedValue(full)
      svc.listAdminProjects.mockReturnValueOnce(new Promise(() => {}))
      window.location.hash = '#/admin/proyectos?editar=p1'
      render(<ProjectsAdminSection />)
      expect(await screen.findByRole('dialog', { name: 'Editar proyecto' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Casa Azul', level: 3 })).not.toBeInTheDocument()
    })

    it('updates the row in place after saving and closes', async () => {
      svc.getProjectById.mockResolvedValue(full)
      svc.updateProjectWithImages.mockResolvedValue({ ...full, name: 'Casa Roja', updated_at: '2026-03-01T00:00:00Z' })
      render(<ProjectsAdminSection />)
      await screen.findByText('Casa Azul')
      act(() => {
        window.location.hash = '#/admin/proyectos?editar=p1'
      })
      const name = await screen.findByLabelText('Nombre *')
      await userEvent.clear(name)
      await userEvent.type(name, 'Casa Roja')
      await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
      expect(await screen.findByRole('heading', { name: 'Casa Roja' })).toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(window.location.hash).toBe('#/admin/proyectos')
      expect(svc.listAdminProjects).toHaveBeenCalledTimes(1)
      expect(getToast()?.message).toBe('Proyecto actualizado')
    })

    it('closes with Escape, leaving the list as it was', async () => {
      svc.getProjectById.mockResolvedValue(full)
      window.location.hash = '#/admin/proyectos?editar=p1'
      render(<ProjectsAdminSection />)
      await screen.findByRole('dialog')
      await userEvent.keyboard('{Escape}')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(window.location.hash).toBe('#/admin/proyectos')
    })
  })

  describe('new project over the list', () => {
    it('opens from the button without leaving the list', async () => {
      render(<ProjectsAdminSection />)
      expect(await screen.findByRole('link', { name: 'Nuevo proyecto' })).toHaveAttribute('href', '#/admin/proyectos?nuevo')
    })

    it('creates it, adds the row in place and closes, without reading the list again', async () => {
      svc.createProjectWithImages.mockResolvedValue({ id: 'p9', name: 'Casa Nueva', status: 'open', country: null, region: null, created_by: 'admin-1', updated_at: '2026-04-01T00:00:00Z' })
      render(<ProjectsAdminSection />)
      await screen.findByText('Casa Azul')
      act(() => {
        window.location.hash = '#/admin/proyectos?nuevo'
      })
      expect(await screen.findByRole('dialog', { name: 'Nuevo proyecto' })).toBeInTheDocument()
      await userEvent.type(screen.getByLabelText('Nombre *'), 'Casa Nueva')
      await userEvent.click(screen.getByRole('button', { name: 'Guardar proyecto' }))
      expect(await screen.findByRole('heading', { name: 'Casa Nueva' })).toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(window.location.hash).toBe('#/admin/proyectos')
      expect(svc.listAdminProjects).toHaveBeenCalledTimes(1)
      expect(getToast()?.message).toBe('Proyecto creado')
    })

    it('cancels back to the list', async () => {
      window.location.hash = '#/admin/proyectos?nuevo'
      render(<ProjectsAdminSection />)
      await screen.findByRole('dialog', { name: 'Nuevo proyecto' })
      await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(window.location.hash).toBe('#/admin/proyectos')
    })
  })


  it('shows who created each project, without a control to change it here', async () => {
    render(<ProjectsAdminSection />)
    await screen.findByText('Casa Azul')
    const [first, second] = screen.getAllByText('Creador:').map((el) => el.parentElement)
    expect(first).toHaveTextContent('Creador: Sin asignar')
    await vi.waitFor(() => expect(second).toHaveTextContent('Creador: Leo'))
    expect(screen.queryByRole('combobox', { name: /Creador/ })).not.toBeInTheDocument()
  })

  it('deletes only after confirming', async () => {
    svc.deleteProjectWithImages.mockResolvedValue(undefined)
    render(<ProjectsAdminSection />)
    await screen.findByText('Casa Azul')
    await userEvent.click(screen.getAllByRole('button', { name: 'Eliminar' })[0])
    expect(svc.deleteProjectWithImages).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Sí, eliminar' }))
    expect(svc.deleteProjectWithImages).toHaveBeenCalledWith('p1')
    expect(screen.queryByText('Casa Azul')).not.toBeInTheDocument()
  })

  it('searches by name', async () => {
    render(<ProjectsAdminSection />)
    await screen.findByText('Casa Azul')
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar proyecto' }), 'escuela')
    expect(screen.queryByText('Casa Azul')).not.toBeInTheDocument()
    expect(screen.getByText('Escuela')).toBeInTheDocument()
  })
})

describe('PinsSection', () => {
  const pin = { id: 'k1', title: 'Pozo', description: 'Cerca', lat: 1, lng: 2, created_at: 'x', image_path: null, country: 'México', region: 'Yucatán', city: 'Mérida', languages: ['es'], kind: 'family' }

  it('edits a pin in the same form as the map, photo included', async () => {
    svc.getPins.mockResolvedValue([pin])
    svc.updatePinWithImage.mockResolvedValue({ ...pin, title: 'Pozo 2' })
    render(<PinsSection />)
    await screen.findByText('Pozo')
    await userEvent.click(screen.getByRole('button', { name: 'Editar' }))
    const title = screen.getByLabelText('Título')
    await userEvent.clear(title)
    await userEvent.type(title, 'Pozo 2')
    const file = new File(['x'], 'nueva.png', { type: 'image/png' })
    await userEvent.upload(screen.getByLabelText('Imagen'), file)
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(svc.updatePinWithImage).toHaveBeenCalledWith(
      pin,
      { title: 'Pozo 2', description: 'Cerca', country: 'México', region: 'Yucatán', city: 'Mérida', kind: 'family', languages: ['es'] },
      file,
      undefined,
    )
    expect(await screen.findByText('Pozo 2')).toBeInTheDocument()
  })

  it('shows the type, languages and contact of each pin, without a control to change it in the list', async () => {
    svc.getPins.mockResolvedValue([{ ...pin, languages: ['es', 'quc'] }])
    svc.listPinContacts.mockResolvedValue(new Map([['k1', 'u2']]))
    render(<PinsSection />)
    await screen.findByText('Pozo')
    expect(screen.getByText(/Familia · Mérida, Yucatán, México/)).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Idiomas' })).getAllByRole('listitem').map((li) => li.textContent)).toEqual(["Español", "K'iche'"])
    await vi.waitFor(() => expect(screen.getByText('Contacto:').parentElement).toHaveTextContent('Contacto: Leo'))
    expect(screen.queryByRole('combobox', { name: /Contacto/ })).not.toBeInTheDocument()
  })

  it('shows "Sin contacto" when the pin has none', async () => {
    svc.getPins.mockResolvedValue([pin])
    render(<PinsSection />)
    await screen.findByText('Pozo')
    expect(screen.getByText('Contacto:').parentElement).toHaveTextContent('Contacto: Sin contacto')
  })

  it('changes the contact from the edit form, and only when it changed', async () => {
    svc.getPins.mockResolvedValue([pin])
    svc.listPinContacts.mockResolvedValue(new Map([['k1', 'u2']]))
    svc.updatePinWithImage.mockResolvedValue(pin)
    svc.setPinContact.mockResolvedValue(undefined)
    render(<PinsSection />)
    await screen.findByText('Pozo')
    await vi.waitFor(() => expect(screen.getByText('Contacto:').parentElement).toHaveTextContent('Leo'))
    await userEvent.click(screen.getByRole('button', { name: 'Editar' }))
    const select = screen.getByLabelText(/^Contacto/)
    expect(select).toHaveValue('u2')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(svc.setPinContact).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Editar' }))
    await userEvent.selectOptions(screen.getByLabelText(/^Contacto/), 'u1')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(svc.setPinContact).toHaveBeenCalledWith('k1', 'u1')
    await vi.waitFor(() => expect(screen.getByText('Contacto:').parentElement).toHaveTextContent('Contacto: Ana'))
  })

  it('removes the contact with "Sin contacto"', async () => {
    svc.getPins.mockResolvedValue([pin])
    svc.listPinContacts.mockResolvedValue(new Map([['k1', 'u2']]))
    svc.updatePinWithImage.mockResolvedValue(pin)
    svc.setPinContact.mockResolvedValue(undefined)
    render(<PinsSection />)
    await screen.findByText('Pozo')
    await vi.waitFor(() => expect(screen.getByText('Contacto:').parentElement).toHaveTextContent('Leo'))
    await userEvent.click(screen.getByRole('button', { name: 'Editar' }))
    await userEvent.selectOptions(screen.getByLabelText(/^Contacto/), '')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(svc.setPinContact).toHaveBeenCalledWith('k1', null)
  })

  it('shows where each pin is and filters by country, with those still without one', async () => {
    svc.getPins.mockResolvedValue([
      pin,
      { ...pin, id: 'k2', title: 'Escuela', country: 'Guatemala', region: '', city: 'Antigua' },
      { ...pin, id: 'k3', title: 'Puente', country: '', region: '', city: '' },
    ])
    render(<PinsSection />)
    await screen.findByText('Pozo')
    expect(screen.getByText(/Mérida, Yucatán, México/)).toBeInTheDocument()
    expect(screen.getByText(/Antigua, Guatemala/)).toBeInTheDocument()
    const select = screen.getByRole('combobox', { name: 'Filtrar por país' })
    await userEvent.selectOptions(select, 'Guatemala')
    expect(screen.queryByText('Pozo')).not.toBeInTheDocument()
    expect(screen.getByText('Escuela')).toBeInTheDocument()
    await userEvent.selectOptions(select, screen.getByRole('option', { name: 'Sin país (1)' }))
    expect(screen.getByText('Puente')).toBeInTheDocument()
    expect(screen.queryByText('Escuela')).not.toBeInTheDocument()
  })

  it('narrows by state inside a country', async () => {
    svc.getPins.mockResolvedValue([
      pin,
      { ...pin, id: 'k2', title: 'Escuela', region: 'Chiapas', city: 'Tapachula' },
      { ...pin, id: 'k3', title: 'Puente', region: '', city: '' },
    ])
    render(<PinsSection />)
    await screen.findByText('Pozo')
    expect(screen.queryByRole('combobox', { name: 'Filtrar por estado' })).not.toBeInTheDocument()
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Filtrar por país' }), 'México')
    const region = screen.getByRole('combobox', { name: 'Filtrar por estado' })
    await userEvent.selectOptions(region, 'Chiapas')
    expect(screen.getByText('Escuela')).toBeInTheDocument()
    expect(screen.queryByText('Pozo')).not.toBeInTheDocument()
    await userEvent.selectOptions(region, screen.getByRole('option', { name: 'Sin estado (1)' }))
    expect(screen.getByText('Puente')).toBeInTheDocument()
    expect(screen.queryByText('Escuela')).not.toBeInTheDocument()
  })

  it('makes the country filter searchable when there are many countries', async () => {
    const names = ['Argentina', 'Bolivia', 'Brasil', 'Chile', 'Colombia', 'Costa Rica', 'Cuba', 'Ecuador', 'El Salvador', 'España', 'Guatemala', 'México']
    svc.getPins.mockResolvedValue(names.map((country, i) => ({ ...pin, id: `k${i}`, title: `Pin ${country}`, country, region: '', city: '' })))
    render(<PinsSection />)
    await screen.findByText('Pin Argentina')
    const filter = screen.getByRole('combobox', { name: 'Filtrar por país' })
    expect(filter.tagName).toBe('INPUT')
    await userEvent.type(filter, 'espana')
    await userEvent.click(screen.getByRole('option', { name: 'España (1)' }))
    expect(screen.getByText('Pin España')).toBeInTheDocument()
    expect(screen.queryByText('Pin Chile')).not.toBeInTheDocument()
    await userEvent.clear(filter)
    expect(screen.getByText('Pin Chile')).toBeInTheDocument()
  })

  describe('map', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ ...pin, id: `k${i}`, title: `Pin ${i}`, lat: i, lng: i }))

    it('draws the filtered pins at their exact places, falling back to the approximate ones', async () => {
      svc.getPins.mockResolvedValue([pin, { ...pin, id: 'k2', title: 'Escuela', country: 'Guatemala', lat: 3, lng: 4 }])
      svc.listPinLocations.mockResolvedValue(new Map([['k1', [10.5, 20.5]]]))
      render(<PinsSection />)
      await screen.findByText('Pozo')
      await vi.waitFor(() => expect(screen.getByTestId('marker-k1')).toHaveTextContent('10.5,20.5'))
      expect(screen.getByTestId('marker-k2')).toHaveTextContent('3,4')
      await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Filtrar por país' }), 'Guatemala')
      expect(screen.queryByTestId('marker-k1')).not.toBeInTheDocument()
      expect(screen.getByTestId('marker-k2')).toBeInTheDocument()
    })

    it('shows the pin on the map when its card or title is clicked', async () => {
      svc.getPins.mockResolvedValue([pin])
      render(<PinsSection />)
      await userEvent.click(await screen.findByText('Cerca'))
      expect(screen.getByTestId('map')).toHaveAttribute('data-selected', 'k1')
      await userEvent.click(screen.getByRole('button', { name: 'Pozo: ver en el mapa' }))
      expect(screen.getByRole('button', { name: 'Pozo: ver en el mapa' })).toHaveAttribute('aria-pressed', 'true')
    })

    it('does not select when a control of the card is used', async () => {
      svc.getPins.mockResolvedValue([pin])
      render(<PinsSection />)
      await userEvent.click(await screen.findByRole('button', { name: 'Editar' }))
      expect(screen.getByTestId('map')).toHaveAttribute('data-selected', '')
    })

    it('goes to the page of a pin chosen on the map', async () => {
      svc.getPins.mockResolvedValue(many)
      render(<PinsSection />)
      await screen.findByText('Pin 0')
      expect(screen.queryByText('Pin 9')).not.toBeInTheDocument()
      await userEvent.click(screen.getByTestId('marker-k9'))
      expect(await screen.findByText('Pin 9')).toBeInTheDocument()
      expect(screen.getByTestId('map')).toHaveAttribute('data-selected', 'k9')
    })

    it('takes turns with the list on narrow screens', async () => {
      svc.getPins.mockResolvedValue([pin])
      render(<PinsSection />)
      await screen.findByText('Pozo')
      expect(screen.getByTestId('map')).toHaveAttribute('data-visible', 'false')
      await userEvent.click(screen.getByRole('button', { name: 'Ver en el mapa' }))
      expect(screen.getByTestId('map')).toHaveAttribute('data-visible', 'true')
      expect(screen.getByTestId('map')).toHaveAttribute('data-selected', 'k1')
      await userEvent.click(screen.getByRole('button', { name: 'Lista' }))
      expect(screen.getByTestId('map')).toHaveAttribute('data-visible', 'false')
    })

    it('shows the exact place when editing, and no place for pins that only have the approximate one', async () => {
      svc.getPins.mockResolvedValue([pin, { ...pin, id: 'k2', title: 'Escuela' }])
      svc.listPinLocations.mockResolvedValue(new Map([['k1', [10.12345, 20.54321]]]))
      render(<PinsSection />)
      await screen.findByText('Escuela')
      await vi.waitFor(() => expect(screen.getByTestId('marker-k1')).toHaveTextContent('10.12345'))
      await userEvent.click(screen.getAllByRole('button', { name: 'Editar' })[0])
      expect(screen.getByText('10.12345, 20.54321')).toBeInTheDocument()
    })

    it('forgets the selection of a deleted pin', async () => {
      svc.getPins.mockResolvedValue([pin])
      svc.deletePin.mockResolvedValue(undefined)
      render(<PinsSection />)
      await userEvent.click(await screen.findByRole('button', { name: 'Pozo: ver en el mapa' }))
      await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }))
      await userEvent.click(screen.getByRole('button', { name: 'Sí, eliminar' }))
      expect(screen.getByTestId('map')).toHaveAttribute('data-selected', '')
    })
  })

  it('deletes after confirming', async () => {
    svc.getPins.mockResolvedValue([pin])
    svc.deletePin.mockResolvedValue(undefined)
    render(<PinsSection />)
    await screen.findByText('Pozo')
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sí, eliminar' }))
    expect(svc.deletePin).toHaveBeenCalledWith(pin)
    expect(screen.getByText('Aún no hay pines en el mapa.')).toBeInTheDocument()
  })
})

describe('ModerationSection', () => {
  beforeEach(() => {
    window.location.hash = ''
  })

  it('lists every conversation with both people and reads a thread without writing', async () => {
    svc.listAllConversations.mockResolvedValue([
      { id: 'c1', userA: 'u1', userB: 'u2', projectId: 'p1', projectName: 'Casa Azul', lastBody: 'Hola', lastMessageAt: '2026-11-10T12:00:00Z' },
    ])
    svc.listThread.mockResolvedValue([
      { id: 'm1', conversation_id: 'c1', sender_id: 'u1', recipient_id: 'u2', project_id: 'p1', sender_name: 'Ana', body: 'Hola', created_at: '2026-11-10T12:00:00Z', read_at: null },
    ])
    window.location.hash = '#/admin/mensajes/c1'
    render(<ModerationSection />)
    // In the list and in the thread's header.
    expect(await screen.findAllByText('Ana Paz ↔ Leo')).toHaveLength(2)
    expect(await screen.findByText('Solo lectura: moderación')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(svc.listThread).toHaveBeenCalledWith('c1')
  })

  it('says so when there are none', async () => {
    svc.listAllConversations.mockResolvedValue([])
    render(<ModerationSection />)
    expect(await screen.findByText('Aún no hay conversaciones.')).toBeInTheDocument()
  })
})

describe('ContactInboxSection', () => {
  const msg = (id: string, readAt: string | null) => ({ id, name: `Persona ${id}`, contact: id === 'c1' ? 'ana@correo.com' : '+52 55 1234 5678', body: `Texto ${id}`, language: 'es', createdAt: '2026-11-18T10:00:00Z', readAt })

  beforeEach(() => {
    window.location.hash = '#/admin/contacto'
    vi.mocked(listContactMessages).mockReset().mockResolvedValue([msg('c1', null), msg('c2', '2026-11-18T11:00:00Z')])
    vi.mocked(setContactRead).mockReset().mockResolvedValue(undefined)
  })

  it('lists them and marks the unread ones', async () => {
    render(<ContactInboxSection />)
    expect(await screen.findByText('Persona c1')).toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: 'Sin leer' })).toHaveLength(1)
  })

  it('marks one read when it is opened, and lets the admin mark it unread again', async () => {
    window.location.hash = '#/admin/contacto/c1'
    render(<ContactInboxSection />)
    expect(await screen.findByRole('link', { name: 'ana@correo.com' })).toHaveAttribute('href', 'mailto:ana@correo.com')
    await waitFor(() => expect(setContactRead).toHaveBeenCalledWith('c1', true))
    expect(screen.queryByRole('img', { name: 'Sin leer' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Marcar como no leído' }))
    expect(setContactRead).toHaveBeenLastCalledWith('c1', false)
    expect(await screen.findByRole('img', { name: 'Sin leer' })).toBeInTheDocument()
    expect(setContactRead).toHaveBeenCalledTimes(2)
  })

  it('links a phone number to call it, and does not touch one already read', async () => {
    window.location.hash = '#/admin/contacto/c2'
    render(<ContactInboxSection />)
    expect(await screen.findByRole('link', { name: '+52 55 1234 5678' })).toHaveAttribute('href', 'tel:+525512345678')
    expect(setContactRead).not.toHaveBeenCalled()
  })

  it('says when there is nothing', async () => {
    vi.mocked(listContactMessages).mockResolvedValue([])
    render(<ContactInboxSection />)
    expect(await screen.findByText('Aún no hay mensajes de contacto.')).toBeInTheDocument()
  })
})

describe('AuditSection', () => {
  const entry = (id: number, action: string, extra = {}) => ({
    id, createdAt: '2026-11-18T10:00:00Z', actorId: 'u1', actorEmail: 'ana@b.co', action, entityType: 'user', entityId: 'u2',
    entityLabel: 'luis@b.co', before: null, after: null, ...extra,
  })

  beforeEach(() => {
    svc.listUsers.mockResolvedValue([
      { id: 'u1', email: 'ana@b.co', firstName: 'Ana', lastName: 'Pérez', role: 'admin', createdAt: '2026-01-01T00:00:00Z', lastSignInAt: null, bannedUntil: null, language: null },
    ])
    vi.mocked(listAuditLog).mockReset().mockResolvedValue({
      total: 60,
      entries: [
        entry(2, 'user.role_changed', { before: { role: 'subscriber' }, after: { role: 'creator' } }),
        entry(1, 'auth.login', { entityLabel: 'ana@b.co' }),
      ],
    })
  })

  it('lists who did what, with the user named', async () => {
    render(<AuditSection />)
    expect(await screen.findByText('Cambió el rol de un usuario')).toBeInTheDocument()
    expect(screen.getAllByText(/Por Ana Pérez/).length).toBeGreaterThan(0)
    expect(screen.getByText('60 registros')).toBeInTheDocument()
  })

  it('shows what changed, before and after, when a row is opened', async () => {
    render(<AuditSection />)
    await userEvent.click((await screen.findAllByRole('button', { name: 'Ver detalle' }))[0])
    expect(screen.getByText('Suscriptor')).toBeInTheDocument()
    expect(screen.getByText('Creador')).toBeInTheDocument()
  })

  it('filters, and goes back to the first page', async () => {
    render(<AuditSection />)
    await screen.findByText('Cambió el rol de un usuario')
    await userEvent.selectOptions(screen.getByLabelText('Acción'), 'auth.login')
    await waitFor(() => expect(listAuditLog).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, pageSize: 25, action: 'auth.login' })))
    await userEvent.click(screen.getByRole('button', { name: 'Quitar filtros' }))
    await waitFor(() => expect(listAuditLog).toHaveBeenLastCalledWith(expect.objectContaining({ action: '' })))
  })

  it('changes the page size and the page', async () => {
    render(<AuditSection />)
    await screen.findByText('Cambió el rol de un usuario')
    await userEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
    await waitFor(() => expect(listAuditLog).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })))
    await userEvent.selectOptions(screen.getByLabelText('Por página'), '50')
    await waitFor(() => expect(listAuditLog).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, pageSize: 50 })))
  })

  it('says when nothing matches', async () => {
    vi.mocked(listAuditLog).mockResolvedValue({ total: 0, entries: [] })
    render(<AuditSection />)
    expect(await screen.findByText('Aún no hay registros.')).toBeInTheDocument()
  })
})
