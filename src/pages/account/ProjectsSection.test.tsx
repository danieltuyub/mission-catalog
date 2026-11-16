import { render, screen } from '@testing-library/react'
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
afterEach(() => vi.mocked(getAuthSnapshot).mockReturnValue(SIGNED_OUT))

describe('ProjectsSection', () => {
  it('shows only the saved ones to a member, who creates nothing', async () => {
    vi.mocked(listSavedProjectIds).mockResolvedValue(['p1'])
    svc.getProjectsByIds.mockResolvedValue([project('p1', 'Casa Azul')])
    render(<ProjectsSection />)
    expect(await screen.findByRole('link', { name: 'Casa Azul' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Guardados/ })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Creados por mí/ })).not.toBeInTheDocument()
    expect(svc.getCreatedProjects).not.toHaveBeenCalled()
    expect(svc.getProjectsByIds).toHaveBeenCalledWith(['p1'])
  })

  it('shows the created ones first to a creator, and the saved ones as well', async () => {
    vi.mocked(getAuthSnapshot).mockReturnValue(CREATOR)
    vi.mocked(listSavedProjectIds).mockResolvedValue(['p2'])
    svc.getCreatedProjects.mockResolvedValue([project('p1', 'Mío', 'creator-1')])
    svc.getProjectsByIds.mockResolvedValue([project('p2', 'Guardado')])
    render(<ProjectsSection />)
    expect(await screen.findByRole('link', { name: 'Mío' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Guardado' })).toBeInTheDocument()
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(headings).toEqual(['Creados por mí1', 'Guardados1'])
    expect(svc.getCreatedProjects).toHaveBeenCalledWith('creator-1')
    // The creator may edit their own project, not the saved one of someone else.
    expect(screen.getAllByRole('link', { name: 'Editar proyecto' })).toHaveLength(1)
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
})
