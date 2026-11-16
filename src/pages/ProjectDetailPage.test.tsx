import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ADMIN, CREATOR, SIGNED_OUT, SUBSCRIBER } from '../test/auth'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Project } from '../types'

const getProjectById = vi.hoisted(() => vi.fn())
vi.mock('../services/projectService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/projectService')>()),
  getProjectById,
}))

const sendProjectMessage = vi.hoisted(() => vi.fn())
vi.mock('../services/messages', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/messages')>()),
  sendProjectMessage,
}))

import {
  clearProjectsView,
  loadDirection,
  loadFilters,
  loadOpenedFromList,
  loadPage,
  loadPageSize,
  loadSort,
  markOpenedFromList,
  saveDirection,
  saveFilters,
  savePage,
  savePageSize,
  saveSort,
} from '../services/projectsViewStorage'
import { getAuthSnapshot } from '../services/authService'
import { listSavedProjectIds, saveProject, unsaveProject } from '../services/savedProjects'
import { getToast } from '../services/toast'
import ProjectDetailPage from './ProjectDetailPage'

const project: Project = {
  id: 'abc',
  name: 'Iglesia Norte',
  responsible: 'Ana Pérez',
  description: 'Una iglesia en casa',
  started_at: '2025-03-01',
  country: 'México',
  region: 'Yucatán',
  phone: '999 123 4567',
  mail: 'norte@example.com',
  status: 'paused',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const filters = { status: ['open' as const], country: ['México'], region: [], responsible: [] }

describe('ProjectDetailPage', () => {
  beforeEach(() => {
    getProjectById.mockReset()
    getProjectById.mockResolvedValue(project)
    clearProjectsView()
    vi.mocked(window.scrollTo).mockClear()
    // Most tests look at the page as a member; guests have their own tests.
    vi.mocked(getAuthSnapshot).mockReturnValue(SUBSCRIBER)
  })

  afterEach(() => {
    vi.mocked(getAuthSnapshot).mockReturnValue(SIGNED_OUT)
  })

  it('shows the project data', async () => {
    render(<ProjectDetailPage id="abc" />)
    expect(screen.getByRole('status', { hidden: true })).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('Cargando proyecto…')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 1, name: 'Iglesia Norte' })).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByText('Pausado')).toBeInTheDocument()
    expect(screen.getByText('Una iglesia en casa')).toBeInTheDocument()
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument()
    expect(screen.getByText('México')).toBeInTheDocument()
    expect(screen.getByText(/2025/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '999 123 4567' })).toHaveAttribute('href', 'tel:9991234567')
    expect(screen.getByRole('link', { name: 'norte@example.com' })).toHaveAttribute(
      'href',
      'mailto:norte@example.com',
    )
    expect(getProjectById).toHaveBeenCalledWith('abc', true)
  })

  describe('loading skeleton delay', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('reserves the layout but shows the skeleton only after 200 ms', () => {
      getProjectById.mockReturnValue(new Promise(() => {}))
      render(<ProjectDetailPage id="abc" />)
      const skeleton = screen.getByRole('status', { hidden: true })
      expect(skeleton).toHaveAttribute('aria-hidden', 'true')
      expect(skeleton).toHaveClass('opacity-0')

      act(() => {
        vi.advanceTimersByTime(199)
      })
      expect(skeleton).toHaveAttribute('aria-hidden', 'true')

      act(() => {
        vi.advanceTimersByTime(1)
      })
      expect(skeleton).toHaveAttribute('aria-hidden', 'false')
      expect(skeleton).toHaveClass('animate-pulse')
    })

    it('never shows the skeleton when the project arrives in time', async () => {
      render(<ProjectDetailPage id="abc" />)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50)
      })
      expect(screen.getByRole('heading', { level: 1, name: 'Iglesia Norte' })).toBeInTheDocument()
      expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500)
      })
      expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument()
    })
  })

  describe('send message', () => {
    const contact = { ...project, created_by: 'creator-9' }
    const button = () => screen.getByRole('button', { name: 'Enviar mensaje' })

    beforeEach(() => {
      getProjectById.mockResolvedValue(contact)
      sendProjectMessage.mockReset().mockResolvedValue({})
    })

    it('opens the composer for members, sends and confirms with a link to the inbox', async () => {
      render(<ProjectDetailPage id="abc" />)
      await screen.findByRole('heading', { name: 'Iglesia Norte' })
      await userEvent.click(button())
      expect(screen.getByRole('dialog', { name: 'Enviar mensaje' })).toHaveTextContent('Sobre Iglesia Norte')
      await userEvent.type(screen.getByLabelText('Mensaje'), 'Hola, me interesa')
      await userEvent.click(screen.getByRole('button', { name: 'Enviar' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(sendProjectMessage).toHaveBeenCalledWith(project.id, 'Hola, me interesa')
      expect(getToast()).toMatchObject({ message: 'Mensaje enviado', action: { label: 'Ver mensajes' } })
      getToast()?.action?.onClick()
      expect(window.location.hash).toBe('#/cuenta/mensajes')
    })

    it('keeps the composer open and shows why when sending fails', async () => {
      sendProjectMessage.mockRejectedValue(new Error('Tu cuenta no puede enviar mensajes a este contacto.'))
      render(<ProjectDetailPage id="abc" />)
      await screen.findByRole('heading', { name: 'Iglesia Norte' })
      await userEvent.click(button())
      await userEvent.type(screen.getByLabelText('Mensaje'), 'Hola')
      await userEvent.click(screen.getByRole('button', { name: 'Enviar' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('Tu cuenta no puede enviar mensajes')
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('works for admins too', async () => {
      vi.mocked(getAuthSnapshot).mockReturnValue(ADMIN)
      render(<ProjectDetailPage id="abc" />)
      await screen.findByRole('heading', { name: 'Iglesia Norte' })
      await userEvent.click(button())
      expect(screen.getByRole('dialog', { name: 'Enviar mensaje' })).toBeInTheDocument()
    })

    it('asks guests to sign in, without opening anything', async () => {
      vi.mocked(getAuthSnapshot).mockReturnValue(SIGNED_OUT)
      render(<ProjectDetailPage id="abc" />)
      await screen.findByRole('heading', { name: 'Iglesia Norte' })
      await userEvent.click(button())
      expect(getToast()?.message).toBe('Inicia sesión para enviar mensajes')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('tells a signed-in user without the permission they cannot write', async () => {
      vi.mocked(getAuthSnapshot).mockReturnValue({ ...SUBSCRIBER, permissions: [] })
      render(<ProjectDetailPage id="abc" />)
      await screen.findByRole('heading', { name: 'Iglesia Norte' })
      await userEvent.click(button())
      expect(getToast()?.message).toBe('Tu cuenta no puede enviar mensajes')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('is disabled, with the reason, when the project has no contact', async () => {
      getProjectById.mockResolvedValue(project)
      render(<ProjectDetailPage id="abc" />)
      await screen.findByRole('heading', { name: 'Iglesia Norte' })
      expect(button()).toHaveAttribute('aria-disabled', 'true')
      expect(button()).toHaveAttribute('title', 'Este proyecto aún no tiene un contacto asignado')
      await userEvent.click(button())
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('is hidden on your own project', async () => {
      getProjectById.mockResolvedValue({ ...project, created_by: SUBSCRIBER.userId })
      render(<ProjectDetailPage id="abc" />)
      await screen.findByRole('heading', { name: 'Iglesia Norte' })
      expect(screen.queryByRole('button', { name: 'Enviar mensaje' })).not.toBeInTheDocument()
    })

    it('comes before the heart and the edit icon', async () => {
      vi.mocked(getAuthSnapshot).mockReturnValue(ADMIN)
      render(<ProjectDetailPage id="abc" />)
      await screen.findByRole('heading', { name: 'Iglesia Norte' })
      const follows = (a: HTMLElement, b: HTMLElement) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING
      expect(follows(button(), screen.getByRole('button', { name: 'Guardar proyecto' }))).toBeTruthy()
      expect(follows(button(), screen.getByRole('link', { name: 'Editar proyecto' }))).toBeTruthy()
    })
  })

  describe('save heart', () => {
    it('is shown to members, marked when saved, and sits before the edit icon', async () => {
      vi.mocked(getAuthSnapshot).mockReturnValue(ADMIN)
      vi.mocked(listSavedProjectIds).mockResolvedValue([project.id])
      render(<ProjectDetailPage id="abc" />)
      await screen.findByRole('heading', { name: 'Iglesia Norte' })
      const heart = screen.getByRole('button', { name: 'Guardar proyecto' })
      await waitFor(() => expect(heart).toHaveAttribute('aria-pressed', 'true'))
      const edit = screen.getByRole('link', { name: 'Editar proyecto' })
      expect(heart.compareDocumentPosition(edit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it('saves and unsaves with a toast', async () => {
      vi.mocked(listSavedProjectIds).mockResolvedValue([])
      render(<ProjectDetailPage id="abc" />)
      await screen.findByRole('heading', { name: 'Iglesia Norte' })
      const heart = screen.getByRole('button', { name: 'Guardar proyecto' })
      await waitFor(() => expect(heart).toBeEnabled())
      await userEvent.click(heart)
      expect(saveProject).toHaveBeenCalledWith(project.id)
      await waitFor(() => expect(heart).toHaveAttribute('aria-pressed', 'true'))
      await userEvent.click(heart)
      expect(unsaveProject).toHaveBeenCalledWith(project.id)
      await waitFor(() => expect(getToast()?.message).toBe('Proyecto quitado de guardados'))
    })

    it('is shown to guests too, who are asked to sign in without leaving the page', async () => {
      vi.mocked(getAuthSnapshot).mockReturnValue(SIGNED_OUT)
      getProjectById.mockResolvedValue(project)
      render(<ProjectDetailPage id="abc" />)
      await screen.findByRole('heading', { name: 'Iglesia Norte' })
      await userEvent.click(screen.getByRole('button', { name: 'Guardar proyecto' }))
      expect(getToast()?.message).toBe('Inicia sesión para guardar proyectos')
    })
  })

  describe('edit shortcut', () => {
    const own = { ...project, created_by: 'creator-1' }

    it('is hidden for members without edit rights', async () => {
      render(<ProjectDetailPage id="abc" />)
      await screen.findByRole('heading', { name: 'Iglesia Norte' })
      expect(screen.queryByRole('link', { name: 'Editar proyecto' })).not.toBeInTheDocument()
    })

    it('is an icon link to the edit page for admins', async () => {
      vi.mocked(getAuthSnapshot).mockReturnValue(ADMIN)
      render(<ProjectDetailPage id="abc" />)
      await screen.findByRole('heading', { name: 'Iglesia Norte' })
      expect(screen.getByRole('link', { name: 'Editar proyecto' })).toHaveAttribute(
        'href',
        `#/proyectos/${project.id}/editar`,
      )
    })

    it('shows for a creator on their own project only', async () => {
      vi.mocked(getAuthSnapshot).mockReturnValue(CREATOR)
      getProjectById.mockResolvedValue(own)
      const { unmount } = render(<ProjectDetailPage id="abc" />)
      await screen.findByRole('heading', { name: 'Iglesia Norte' })
      expect(screen.getByRole('link', { name: 'Editar proyecto' })).toBeInTheDocument()
      unmount()

      getProjectById.mockResolvedValue({ ...project, created_by: 'someone-else' })
      render(<ProjectDetailPage id="abc" />)
      await screen.findByRole('heading', { name: 'Iglesia Norte' })
      expect(screen.queryByRole('link', { name: 'Editar proyecto' })).not.toBeInTheDocument()
    })
  })

  describe('guests', () => {
    const summary = { ...project, phone: undefined, mail: undefined, details: undefined }

    beforeEach(() => {
      vi.mocked(getAuthSnapshot).mockReturnValue(SIGNED_OUT)
      getProjectById.mockResolvedValue(summary)
    })

    it('ask for the summary only', async () => {
      render(<ProjectDetailPage id="abc" />)
      await screen.findByRole('heading', { name: 'Iglesia Norte' })
      expect(getProjectById).toHaveBeenCalledWith('abc', false)
    })

    it('do not see contact data or the long details, and are invited to sign in', async () => {
      render(<ProjectDetailPage id="abc" />)
      await screen.findByRole('heading', { name: 'Iglesia Norte' })
      expect(screen.queryByText('Teléfono')).not.toBeInTheDocument()
      expect(screen.queryByText('Mail')).not.toBeInTheDocument()
      expect(screen.queryByRole('region', { name: 'Detalles' })).not.toBeInTheDocument()
      expect(screen.getByText('País')).toBeInTheDocument()
      const login = screen.getByRole('link', { name: 'Iniciar sesión' })
      expect(login).toHaveAttribute('href', `#/login?next=${encodeURIComponent(`/proyectos/${project.id}`)}`)
    })

    it('members do not see the sign-in invitation', async () => {
      vi.mocked(getAuthSnapshot).mockReturnValue(SUBSCRIBER)
      getProjectById.mockResolvedValue(project)
      render(<ProjectDetailPage id="abc" />)
      await screen.findByRole('heading', { name: 'Iglesia Norte' })
      expect(screen.queryByRole('link', { name: 'Iniciar sesión' })).not.toBeInTheDocument()
      expect(screen.getByText('Teléfono')).toBeInTheDocument()
    })

    it('wait for the session before loading', async () => {
      vi.mocked(getAuthSnapshot).mockReturnValue({ ...SIGNED_OUT, loading: true })
      render(<ProjectDetailPage id="abc" />)
      await act(async () => {})
      expect(getProjectById).not.toHaveBeenCalled()
    })
  })

  it('has a photo carousel with placeholders', async () => {
    render(<ProjectDetailPage id="abc" />)
    await screen.findByRole('heading', { name: 'Iglesia Norte' })
    expect(screen.getByRole('region', { name: 'Fotos del proyecto' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Ir a la foto/ })).toHaveLength(3)
  })

  it('shows the real photos in the carousel when the project has them', async () => {
    getProjectById.mockResolvedValue({
      ...project,
      project_images: [
        { id: 'a', path: 'a.webp', position: 0, alt: 'Fachada' },
        { id: 'b', path: 'b.webp', position: 1, alt: null },
      ],
    })
    render(<ProjectDetailPage id="abc" />)
    await screen.findByRole('heading', { name: 'Iglesia Norte' })
    expect(screen.getAllByRole('button', { name: /Ir a la foto/ })).toHaveLength(2)
    expect(screen.getByAltText('Fachada')).toHaveAttribute('src', expect.stringContaining('a.webp'))
  })

  it('shows the details from the database, one paragraph per blank-line block', async () => {
    getProjectById.mockResolvedValue({ ...project, details: 'Primer párrafo.\n\nSegundo párrafo.\ncon salto.' })
    render(<ProjectDetailPage id="abc" />)
    await screen.findByRole('heading', { name: 'Iglesia Norte' })
    const section = screen.getByRole('region', { name: 'Detalles' })
    expect(within(section).getByRole('heading', { level: 2, name: 'Detalles' })).toBeInTheDocument()
    const paragraphs = section.querySelectorAll('p')
    expect(paragraphs).toHaveLength(2)
    expect(paragraphs[0]).toHaveTextContent('Primer párrafo.')
    expect(paragraphs[1]).toHaveTextContent('Segundo párrafo. con salto.')
  })

  it.each([[null], [undefined], ['  \n\n ']])('says there are no details when it is %j', async (details) => {
    getProjectById.mockResolvedValue({ ...project, details })
    render(<ProjectDetailPage id="abc" />)
    await screen.findByRole('heading', { name: 'Iglesia Norte' })
    const section = screen.getByRole('region', { name: 'Detalles' })
    expect(within(section).getByText('Sin detalles')).toBeInTheDocument()
    expect(section).not.toHaveTextContent('nació como un grupo')
  })

  it('fills missing values with dashes', async () => {
    getProjectById.mockResolvedValue({
      ...project,
      responsible: null,
      description: null,
      started_at: null,
      country: null,
      region: null,
      phone: null,
      mail: null,
    })
    render(<ProjectDetailPage id="abc" />)
    await screen.findByRole('heading', { name: 'Iglesia Norte' })
    expect(screen.getAllByText('—')).toHaveLength(6)
    expect(screen.getByText('Sin descripción')).toBeInTheDocument()
  })

  it('shows a not-found state', async () => {
    getProjectById.mockResolvedValue(null)
    render(<ProjectDetailPage id="zzz" />)
    expect(await screen.findByRole('heading', { name: 'Proyecto no encontrado' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Proyectos' })).toHaveAttribute('href', '#/proyectos')
  })

  it('shows an error', async () => {
    getProjectById.mockRejectedValue(new Error('boom'))
    render(<ProjectDetailPage id="abc" />)
    expect(await screen.findByRole('alert')).toHaveTextContent('boom')
  })

  it('scrolls to the top on open', async () => {
    render(<ProjectDetailPage id="abc" />)
    await screen.findByRole('heading', { name: 'Iglesia Norte' })
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
  })

  describe('opened from the list', () => {
    beforeEach(() => {
      saveFilters({ ...filters, region: ['Norte'] })
      savePage(2)
      markOpenedFromList(300)
    })

    it('keeps the list context for the way back without showing any filter legend', async () => {
      saveSort('created_at')
      saveDirection('asc')
      render(<ProjectDetailPage id="abc" />)
      await screen.findByRole('heading', { name: 'Iglesia Norte' })
      expect(screen.getByRole('link', { name: 'Proyectos' })).toHaveAttribute('href', '#/proyectos')
      expect(screen.queryByText(/filtro/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/Página 2/)).not.toBeInTheDocument()
      // The list will restore from this state.
      expect(loadFilters()?.country).toEqual(['México'])
      expect(loadPage()).toBe(2)
      expect(loadSort()).toBe('created_at')
      expect(loadDirection()).toBe('asc')
      expect(loadOpenedFromList()).toBe(false)
    })
  })

  describe('opened by URL', () => {
    it('resets filters and page, keeping size and sort', async () => {
      saveFilters(filters)
      savePage(3)
      savePageSize(6)
      saveSort('created_at')
      render(<ProjectDetailPage id="abc" />)
      await screen.findByRole('heading', { name: 'Iglesia Norte' })
      expect(screen.queryByText(/filtro/)).not.toBeInTheDocument()
      expect(loadFilters()).toBeNull()
      expect(loadPage()).toBeNull()
      expect(loadPageSize()).toBe(6)
      expect(loadSort()).toBe('created_at')
      expect(loadDirection()).toBeNull()
    })
  })
})
