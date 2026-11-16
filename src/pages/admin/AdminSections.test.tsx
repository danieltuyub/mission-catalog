import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const svc = vi.hoisted(() => ({
  listUsers: vi.fn(),
  setUserRole: vi.fn(),
  updateUserName: vi.fn(),
  listAllRequests: vi.fn(),
  approveRequest: vi.fn(),
  rejectRequest: vi.fn(),
  requestImageUrl: vi.fn(),
  listAdminProjects: vi.fn(),
  assignProjectCreator: vi.fn(),
  deleteProjectWithImages: vi.fn(),
  getPins: vi.fn(),
  updatePin: vi.fn(),
  deletePin: vi.fn(),
  listAllConversations: vi.fn(),
  listThread: vi.fn(),
}))

vi.mock('../../services/adminUsers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/adminUsers')>()),
  listUsers: svc.listUsers,
  setUserRole: svc.setUserRole,
  updateUserName: svc.updateUserName,
}))
vi.mock('../../services/pinRequests', () => ({
  listAllRequests: svc.listAllRequests,
  approveRequest: svc.approveRequest,
  rejectRequest: svc.rejectRequest,
  requestImageUrl: svc.requestImageUrl,
  listMyRequests: vi.fn(),
  MAX_PENDING_REQUESTS: 5,
}))
vi.mock('../../services/projectAdmin', () => ({
  listAdminProjects: svc.listAdminProjects,
  assignProjectCreator: svc.assignProjectCreator,
  deleteProjectWithImages: svc.deleteProjectWithImages,
}))
vi.mock('../../services/pinService', () => ({
  getPins: svc.getPins,
  updatePin: svc.updatePin,
  deletePin: svc.deletePin,
  pinImageUrl: (p: string) => `https://img/${p}`,
}))
vi.mock('../../services/messages', () => ({
  listAllConversations: svc.listAllConversations,
  listThread: svc.listThread,
}))

import { getAuthSnapshot } from '../../services/authService'
import { getToast } from '../../services/toast'
import { ADMIN } from '../../test/auth'
import ModerationSection from './ModerationSection'
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
  ...over,
})
const USERS = [user({}), user({ id: 'u2', email: 'leo@x.com', firstName: 'Leo', lastName: '', role: 'creator' }), user({ id: 'admin-1', email: 'a@b.com', firstName: 'Yo', lastName: '', role: 'admin' })]

beforeEach(() => {
  vi.mocked(getAuthSnapshot).mockReturnValue(ADMIN)
  for (const fn of Object.values(svc)) fn.mockReset()
  svc.listUsers.mockResolvedValue(USERS)
  svc.requestImageUrl.mockResolvedValue('https://signed')
})

describe('UsersSection', () => {
  it('changes a role and reloads', async () => {
    svc.setUserRole.mockResolvedValue(undefined)
    render(<UsersSection />)
    const select = await screen.findByRole('combobox', { name: 'Rol de Ana Paz' })
    await userEvent.selectOptions(select, 'creator')
    expect(svc.setUserRole).toHaveBeenCalledWith('u1', 'creator')
    expect(getToast()?.message).toBe('Rol actualizado')
    expect(svc.listUsers).toHaveBeenCalledTimes(2)
  })

  it('does not let an admin change their own role', async () => {
    render(<UsersSection />)
    expect(await screen.findByRole('combobox', { name: 'Rol de Yo' })).toBeDisabled()
  })

  it('edits a name', async () => {
    svc.updateUserName.mockResolvedValue(undefined)
    render(<UsersSection />)
    await screen.findByText('Ana Paz')
    await userEvent.click(screen.getAllByRole('button', { name: 'Editar nombre' })[0])
    const form = screen.getByRole('form', { name: 'Editar nombre de ana@x.com' })
    const first = within(form).getByLabelText('Nombre')
    await userEvent.clear(first)
    await userEvent.type(first, 'Anita')
    await userEvent.click(within(form).getByRole('button', { name: 'Guardar' }))
    expect(svc.updateUserName).toHaveBeenCalledWith('u1', 'Anita', 'Paz')
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
  image_path: null,
  status: 'pending',
  created_at: '2026-11-10T12:00:00Z',
  ...over,
})

describe('PinRequestsSection', () => {
  beforeEach(() => {
    svc.listAllRequests.mockResolvedValue([request({}), request({ id: 'r2', title: 'Viejo', status: 'approved' })])
  })

  it('shows pending requests first, with who asked', async () => {
    render(<PinRequestsSection />)
    expect(await screen.findByText('Pozo nuevo')).toBeInTheDocument()
    expect(screen.queryByText('Viejo')).not.toBeInTheDocument()
    expect(await screen.findByText(/Ana Paz/)).toBeInTheDocument()
  })

  it('approves and moves it to the reviewed ones', async () => {
    svc.approveRequest.mockResolvedValue(undefined)
    render(<PinRequestsSection />)
    await userEvent.click(await screen.findByRole('button', { name: 'Aprobar' }))
    expect(svc.approveRequest).toHaveBeenCalledWith(expect.objectContaining({ id: 'r1' }))
    expect(getToast()?.message).toBe('Pin publicado en el mapa')
    expect(screen.getByText('No hay solicitudes pendientes.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Revisadas/ }))
    expect(screen.getByText('Pozo nuevo')).toBeInTheDocument()
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
    expect(svc.listAllRequests).toHaveBeenCalledTimes(2)
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
    expect(screen.getAllByRole('link', { name: 'Editar' })[0]).toHaveAttribute('href', '#/proyectos/p1/editar?from=admin')
  })

  it('creates a project coming back to this list', async () => {
    render(<ProjectsAdminSection />)
    expect(await screen.findByRole('link', { name: 'Nuevo proyecto' })).toHaveAttribute('href', '#/proyectos/nuevo?from=admin')
  })

  it('offers creators and admins as owners, and assigns one', async () => {
    svc.assignProjectCreator.mockResolvedValue(undefined)
    render(<ProjectsAdminSection />)
    const select = await screen.findByRole('combobox', { name: 'Creador de Casa Azul' })
    const options = within(select).getAllByRole('option').map((o) => o.textContent)
    expect(options).toEqual(['Sin asignar', 'Leo', 'Yo'])
    await userEvent.selectOptions(select, 'u2')
    expect(svc.assignProjectCreator).toHaveBeenCalledWith('p1', 'u2')
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
  const pin = { id: 'k1', title: 'Pozo', description: 'Cerca', lat: 1, lng: 2, created_at: 'x', image_path: null }

  it('edits the text of a pin', async () => {
    svc.getPins.mockResolvedValue([pin])
    svc.updatePin.mockResolvedValue({ ...pin, title: 'Pozo 2' })
    render(<PinsSection />)
    await screen.findByText('Pozo')
    await userEvent.click(screen.getByRole('button', { name: 'Editar' }))
    const title = screen.getByLabelText('Título')
    await userEvent.clear(title)
    await userEvent.type(title, 'Pozo 2')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(svc.updatePin).toHaveBeenCalledWith('k1', { title: 'Pozo 2', description: 'Cerca' })
    expect(await screen.findByText('Pozo 2')).toBeInTheDocument()
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
