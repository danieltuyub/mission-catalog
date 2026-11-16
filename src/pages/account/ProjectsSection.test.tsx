import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const svc = vi.hoisted(() => ({ getCreatedProjects: vi.fn(), getProjectsByIds: vi.fn() }))
vi.mock('../../services/projectService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/projectService')>()),
  ...svc,
}))

import { getAuthSnapshot } from '../../services/authService'
import { listSavedProjectIds } from '../../services/savedProjects'
import { CREATOR, SIGNED_OUT, SUBSCRIBER } from '../../test/auth'
import ProjectsSection from './ProjectsSection'

const project = (id: string, name: string, created_by = 'x') => ({
  id,
  name,
  responsible: '',
  description: '',
  started_at: null,
  country: null,
  region: null,
  status: 'open',
  created_by,
  project_images: [],
})

beforeEach(() => {
  vi.mocked(getAuthSnapshot).mockReturnValue(SUBSCRIBER)
  svc.getCreatedProjects.mockReset().mockResolvedValue([])
  svc.getProjectsByIds.mockReset().mockResolvedValue([])
  vi.mocked(listSavedProjectIds).mockReset().mockResolvedValue([])
})
afterEach(() => {
  vi.mocked(getAuthSnapshot).mockReturnValue(SIGNED_OUT)
  window.location.hash = ''
})

describe('ProjectsSection', () => {
  it('shows only the saved ones to a member, who creates nothing', async () => {
    vi.mocked(listSavedProjectIds).mockResolvedValue(['p1'])
    svc.getProjectsByIds.mockResolvedValue([project('p1', 'Casa Azul')])
    render(<ProjectsSection />)
    expect(await screen.findByRole('link', { name: 'Casa Azul' })).toBeInTheDocument()
    // One list only: nothing to choose.
    expect(screen.queryByRole('navigation', { name: 'Proyectos' })).not.toBeInTheDocument()
    expect(svc.getCreatedProjects).not.toHaveBeenCalled()
    expect(svc.getProjectsByIds).toHaveBeenCalledWith(['p1'])
  })

  describe('a creator', () => {
    beforeEach(() => {
      vi.mocked(getAuthSnapshot).mockReturnValue(CREATOR)
      vi.mocked(listSavedProjectIds).mockResolvedValue(['p2'])
      svc.getCreatedProjects.mockResolvedValue([project('p1', 'Mío', 'creator-1')])
      svc.getProjectsByIds.mockResolvedValue([project('p2', 'Guardado')])
    })

    it('opens on the created ones, with a chip for each list and its count', async () => {
      render(<ProjectsSection />)
      expect(await screen.findByRole('link', { name: 'Mío' })).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Guardado' })).not.toBeInTheDocument()
      const chips = within(screen.getByRole('navigation', { name: 'Proyectos' }))
      expect(chips.getByRole('link', { name: /Creados por mí/ })).toHaveAttribute('aria-current', 'page')
      expect(chips.getByRole('link', { name: /Guardados/ })).toHaveAttribute('href', '#/cuenta/proyectos/guardados')
      expect(chips.getByRole('link', { name: /Guardados/ })).toHaveTextContent('1')
      expect(svc.getCreatedProjects).toHaveBeenCalledWith('creator-1')
      // They may edit their own project.
      expect(screen.getByRole('link', { name: 'Editar proyecto' })).toBeInTheDocument()
    })

    it('shows the saved ones from the URL, without edit icons on other people’s projects', async () => {
      window.location.hash = '#/cuenta/proyectos/guardados'
      render(<ProjectsSection />)
      expect(await screen.findByRole('link', { name: 'Guardado' })).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Mío' })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Editar proyecto' })).not.toBeInTheDocument()
    })

    it('falls back to the first list on an unknown tab', async () => {
      window.location.hash = '#/cuenta/proyectos/otra'
      render(<ProjectsSection />)
      expect(await screen.findByRole('link', { name: 'Mío' })).toBeInTheDocument()
    })
  })

  it('invites to browse when nothing is saved', async () => {
    render(<ProjectsSection />)
    expect(await screen.findByText('Aún no has guardado proyectos.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver proyectos' })).toHaveAttribute('href', '#/proyectos')
  })

  it('says so when a creator has made none', async () => {
    vi.mocked(getAuthSnapshot).mockReturnValue(CREATOR)
    render(<ProjectsSection />)
    expect(await screen.findByText('Aún no has creado proyectos.')).toBeInTheDocument()
  })

  it('shows the error when they cannot be loaded', async () => {
    vi.mocked(listSavedProjectIds).mockRejectedValue(new Error('boom'))
    render(<ProjectsSection />)
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar tus proyectos')
  })

  it('pages a long list, four at a time', async () => {
    vi.mocked(listSavedProjectIds).mockResolvedValue(['1'])
    svc.getProjectsByIds.mockResolvedValue(Array.from({ length: 6 }, (_, i) => project(String(i), `Proyecto ${i}`)))
    render(<ProjectsSection />)
    await screen.findByRole('link', { name: 'Proyecto 0' })
    expect(screen.getAllByRole('article')).toHaveLength(4)
    await userEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
    expect(screen.getAllByRole('article')).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'Proyecto 5' })).toBeInTheDocument()
  })

  it('offers no pagination when everything fits', async () => {
    vi.mocked(listSavedProjectIds).mockResolvedValue(['1'])
    svc.getProjectsByIds.mockResolvedValue(Array.from({ length: 4 }, (_, i) => project(String(i), `Proyecto ${i}`)))
    render(<ProjectsSection />)
    await screen.findByRole('link', { name: 'Proyecto 0' })
    expect(screen.queryByRole('button', { name: 'Página siguiente' })).not.toBeInTheDocument()
  })
})
