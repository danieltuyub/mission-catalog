import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const svc = vi.hoisted(() => ({
  listUsers: vi.fn(),
  setUserRole: vi.fn(),
  updateUserName: vi.fn(),
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
}))

vi.mock('../../services/adminUsers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/adminUsers')>()),
  listUsers: svc.listUsers,
  setUserRole: svc.setUserRole,
  updateUserName: svc.updateUserName,
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
  svc.getPins.mockResolvedValue([])
  svc.listPinContacts.mockResolvedValue(new Map())
  svc.listPinLocations.mockResolvedValue(new Map())
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
    expect(screen.getAllByRole('link', { name: 'Editar' })[0]).toHaveAttribute('href', '#/proyectos/p1/editar?from=admin')
  })

  it('creates a project coming back to this list', async () => {
    render(<ProjectsAdminSection />)
    expect(await screen.findByRole('link', { name: 'Nuevo proyecto' })).toHaveAttribute('href', '#/proyectos/nuevo?from=admin')
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
