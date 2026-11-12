import { act, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Project } from '../types'

const getProjectById = vi.hoisted(() => vi.fn())
vi.mock('../services/projectService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/projectService')>()),
  getProjectById,
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
    expect(getProjectById).toHaveBeenCalledWith('abc')
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

  it('has a photo carousel with placeholders', async () => {
    render(<ProjectDetailPage id="abc" />)
    await screen.findByRole('heading', { name: 'Iglesia Norte' })
    expect(screen.getByRole('region', { name: 'Fotos del proyecto' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Ir a la foto/ })).toHaveLength(3)
  })

  it('has a Detalles section with a couple of paragraphs about the project', async () => {
    render(<ProjectDetailPage id="abc" />)
    await screen.findByRole('heading', { name: 'Iglesia Norte' })
    const section = screen.getByRole('region', { name: 'Detalles' })
    expect(within(section).getByRole('heading', { level: 2, name: 'Detalles' })).toBeInTheDocument()
    const paragraphs = section.querySelectorAll('p')
    expect(paragraphs).toHaveLength(2)
    expect(paragraphs[0]).toHaveTextContent('Iglesia Norte')
    expect(paragraphs[0]).toHaveTextContent('Yucatán')
    expect(paragraphs[1]).toHaveTextContent('Ana Pérez')
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

    it('summarizes the list context next to the back link and keeps it stored', async () => {
      saveSort('created_at')
      saveDirection('asc')
      render(<ProjectDetailPage id="abc" />)
      await screen.findByRole('heading', { name: 'Iglesia Norte' })
      expect(screen.getByText('3 filtros · Fecha ↑ · Página 2')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Proyectos' })).toHaveAttribute('href', '#/proyectos')
      // The list will restore from this state.
      expect(loadFilters()?.country).toEqual(['México'])
      expect(loadPage()).toBe(2)
      expect(loadOpenedFromList()).toBe(false)
    })

    it('omits what is at its default', async () => {
      render(<ProjectDetailPage id="abc" />)
      await screen.findByRole('heading', { name: 'Iglesia Norte' })
      expect(screen.getByText('3 filtros · Página 2')).toBeInTheDocument()
    })

    it('uses the singular for one filter', async () => {
      saveFilters({ ...filters, country: [] })
      savePage(1)
      render(<ProjectDetailPage id="abc" />)
      await screen.findByRole('heading', { name: 'Iglesia Norte' })
      expect(screen.getByText('1 filtro')).toBeInTheDocument()
    })
  })

  describe('opened by URL', () => {
    it('shows no summary and resets filters and page, keeping size and sort', async () => {
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
