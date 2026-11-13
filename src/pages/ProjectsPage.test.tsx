import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAuthSnapshot } from '../services/authService'
import type { Project } from '../types'

const { getProjects, getProjectFilterOptions } = vi.hoisted(() => ({
  getProjects: vi.fn(),
  getProjectFilterOptions: vi.fn(),
}))
vi.mock('../services/projectService', () => ({
  getProjects,
  getProjectFilterOptions,
  DEFAULT_PAGE_SIZE: 4,
  DEFAULT_SORT: 'name',
  DEFAULT_DIRECTION: { name: 'asc', created_at: 'desc' },
  EMPTY_FILTERS: { status: [], country: [], region: [], responsible: [] },
}))

import {
  clearProjectsView,
  loadOpenedFromList,
  loadScroll,
  markOpenedFromList,
} from '../services/projectsViewStorage'
import ProjectsPage from './ProjectsPage'

const project = (id: string, name: string): Project => ({
  id,
  name,
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

const page = (data: Project[], pageNumber = 1, totalPages = 1) => ({
  data,
  total: data.length,
  page: pageNumber,
  pageSize: 4,
  totalPages,
})

const lastOptions = () => getProjects.mock.lastCall?.[0]

describe('ProjectsPage', () => {
  beforeEach(() => {
    getProjects.mockReset()
    getProjectFilterOptions.mockReset()
    getProjectFilterOptions.mockResolvedValue({
      country: ['México', 'Perú'],
      region: ['Norte'],
      responsible: ['Ana'],
    })
    clearProjectsView()
    window.location.hash = ''
    vi.mocked(window.scrollTo).mockClear()
  })

  it('lists projects from the service', async () => {
    getProjects.mockResolvedValue(page([project('1', 'Uno'), project('2', 'Dos')]))
    render(<ProjectsPage />)
    expect(screen.getByText('Cargando proyectos…')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Uno' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Dos' })).toBeInTheDocument()
  })

  it('shows an edit icon per project only to admins', async () => {
    getProjects.mockResolvedValue(page([project('1', 'Uno'), project('2', 'Dos')]))
    const { unmount } = render(<ProjectsPage />)
    await screen.findByRole('heading', { name: 'Uno' })
    expect(screen.queryByRole('link', { name: 'Editar proyecto' })).not.toBeInTheDocument()
    unmount()

    vi.mocked(getAuthSnapshot).mockReturnValue({ loading: false, email: 'a@b.com', isAdmin: true })
    render(<ProjectsPage />)
    await screen.findByRole('heading', { name: 'Uno' })
    const links = screen.getAllByRole('link', { name: 'Editar proyecto' })
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['#/proyectos/1/editar?from=lista', '#/proyectos/2/editar?from=lista'])
    vi.mocked(getAuthSnapshot).mockReturnValue({ loading: false, email: null, isAdmin: false })
  })

  it('shows the total next to the title, with an accessible label', async () => {
    getProjects.mockResolvedValue({ ...page([project('1', 'Uno'), project('2', 'Dos')]), total: 12 })
    render(<ProjectsPage />)
    await screen.findByRole('heading', { name: 'Uno' })
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('12 proyectos')
    expect(status).toHaveAttribute('title', '12 proyectos')
  })

  it('says "resultados" when filters are applied and uses the singular for one', async () => {
    getProjects.mockImplementation(async ({ filters }: { filters: { country: string[] } }) =>
      filters.country.length
        ? { ...page([project('1', 'Uno')]), total: 1 }
        : { ...page([project('1', 'Uno')]), total: 5 },
    )
    render(<ProjectsPage filterDebounceMs={0} />)
    await screen.findByRole('heading', { name: 'Uno' })
    expect(screen.getByRole('status')).toHaveTextContent('5 proyectos')
    await userEvent.click(await screen.findByRole('checkbox', { name: 'México' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('1 resultado'))
  })

  it('shows an empty state', async () => {
    getProjects.mockResolvedValue(page([]))
    render(<ProjectsPage />)
    expect(await screen.findByText('Aún no hay proyectos')).toBeInTheDocument()
  })

  it('shows an error', async () => {
    getProjects.mockRejectedValue(new Error('boom'))
    render(<ProjectsPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('boom')
  })

  it('loads the selected page from the pagination', async () => {
    getProjects.mockImplementation(async ({ page: p }: { page: number }) =>
      p === 1 ? page([project('1', 'Uno')], 1, 2) : page([project('5', 'Cinco')], 2, 2),
    )
    render(<ProjectsPage />)
    expect(await screen.findByRole('heading', { name: 'Uno' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Página 2' }))
    expect(await screen.findByRole('heading', { name: 'Cinco' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Uno' })).not.toBeInTheDocument()
    expect(lastOptions()).toMatchObject({ page: 2, pageSize: 4, sort: 'name', direction: 'asc' })
  })

  it('uses the pageSize prop', async () => {
    getProjects.mockResolvedValue(page([project('1', 'Uno')]))
    render(<ProjectsPage pageSize={6} />)
    await screen.findByRole('heading', { name: 'Uno' })
    expect(getProjects).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 6 }))
  })

  it('changes the page size, goes back to page 1 and remembers it', async () => {
    getProjects.mockImplementation(async ({ page: p, pageSize: size }: { page: number; pageSize: number }) =>
      page([project(`${p}-${size}`, `P${p}-${size}`)], p, 3),
    )
    const { unmount } = render(<ProjectsPage />)
    await screen.findByRole('heading', { name: 'P1-4' })
    await userEvent.click(screen.getByRole('button', { name: 'Página 2' }))
    await screen.findByRole('heading', { name: 'P2-4' })

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Proyectos por página' }), '8')
    expect(await screen.findByRole('heading', { name: 'P1-8' })).toBeInTheDocument()
    expect(lastOptions()).toMatchObject({ page: 1, pageSize: 8 })

    unmount()
    render(<ProjectsPage />)
    expect(await screen.findByRole('heading', { name: 'P1-8' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Proyectos por página' })).toHaveValue('8')
  })

  it('defaults to 4 per page with 4, 8 and 12 as options, reserving room for 4 cards', async () => {
    getProjects.mockResolvedValue(page([project('1', 'Uno')]))
    render(<ProjectsPage />)
    await screen.findByRole('heading', { name: 'Uno' })
    const select = screen.getByRole('combobox', { name: 'Proyectos por página' })
    expect(select).toHaveValue('4')
    expect([...select.querySelectorAll('option')].map((o) => o.value)).toEqual(['4', '8', '12'])
    expect(getProjects).toHaveBeenCalledWith(expect.objectContaining({ pageSize: 4 }))
    expect(screen.getByTestId('projects-list').style.getPropertyValue('--reserved')).toBe(
      'calc(4 * 14rem + 3 * 1.25rem)',
    )
  })

  it('reserves space for the minimum number of cards', async () => {
    getProjects.mockResolvedValue(page([project('1', 'Uno')]))
    render(<ProjectsPage minSlots={3} />)
    await screen.findByRole('heading', { name: 'Uno' })
    const list = screen.getByTestId('projects-list')
    expect(list.style.getPropertyValue('--reserved')).toBe('calc(3 * 14rem + 2 * 1.25rem)')
  })

  it('sorts by name by default, changes sort, goes back to page 1 and remembers it', async () => {
    getProjects.mockImplementation(
      async ({ page: p, sort, direction }: { page: number; sort: string; direction: string }) =>
        page([project(`${p}-${sort}-${direction}`, `P${p}-${sort}-${direction}`)], p, 3),
    )
    const { unmount } = render(<ProjectsPage />)
    const select = screen.getByRole('combobox', { name: 'Ordenar proyectos' })
    expect(select).toHaveValue('name')
    await screen.findByRole('heading', { name: 'P1-name-asc' })
    await userEvent.click(screen.getByRole('button', { name: 'Página 2' }))
    await screen.findByRole('heading', { name: 'P2-name-asc' })

    await userEvent.selectOptions(select, 'created_at')
    expect(await screen.findByRole('heading', { name: 'P1-created_at-desc' })).toBeInTheDocument()
    expect(lastOptions()).toMatchObject({ page: 1, pageSize: 4, sort: 'created_at', direction: 'desc' })

    unmount()
    render(<ProjectsPage />)
    expect(await screen.findByRole('heading', { name: 'P1-created_at-desc' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Ordenar proyectos' })).toHaveValue('created_at')
  })

  it('toggles the sort direction with a single button and goes back to page 1', async () => {
    getProjects.mockImplementation(
      async ({ page: p, sort, direction }: { page: number; sort: string; direction: string }) =>
        page([project(`${p}`, `P${p}-${sort}-${direction}`)], p, 3),
    )
    render(<ProjectsPage />)
    await screen.findByRole('heading', { name: 'P1-name-asc' })
    expect(screen.getAllByRole('button', { name: /^Orden / })).toHaveLength(1)
    await userEvent.click(screen.getByRole('button', { name: 'Página 2' }))
    await screen.findByRole('heading', { name: 'P2-name-asc' })

    await userEvent.click(screen.getByRole('button', { name: 'Orden ascendente' }))
    expect(await screen.findByRole('heading', { name: 'P1-name-desc' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Orden descendente' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Orden descendente' }))
    expect(await screen.findByRole('heading', { name: 'P1-name-asc' })).toBeInTheDocument()
  })

  it('uses the natural direction of each field when switching sort', async () => {
    getProjects.mockResolvedValue(page([project('1', 'Uno')]))
    render(<ProjectsPage />)
    await screen.findByRole('heading', { name: 'Uno' })
    expect(screen.getByRole('button', { name: 'Orden ascendente' })).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Ordenar proyectos' }), 'created_at')
    expect(screen.getByRole('button', { name: 'Orden descendente' })).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Ordenar proyectos' }), 'name')
    expect(screen.getByRole('button', { name: 'Orden ascendente' })).toBeInTheDocument()
  })

  describe('filters', () => {
    it('renders the filter form with options from the service', async () => {
      getProjects.mockResolvedValue(page([project('1', 'Uno')]))
      render(<ProjectsPage />)
      expect(screen.getByRole('heading', { name: 'Filtros' })).toBeInTheDocument()
      expect(await screen.findByRole('checkbox', { name: 'México' })).toBeInTheDocument()
      expect(screen.getByRole('checkbox', { name: 'Abierto' })).toBeInTheDocument()
      expect(screen.getByRole('checkbox', { name: 'Ana' })).toBeInTheDocument()
    })

    it('queries with the selected filters, goes back to page 1 and remembers them', async () => {
      getProjects.mockImplementation(async ({ page: p }: { page: number }) =>
        page([project(`${p}`, `P${p}`)], p, 3),
      )
      const { unmount } = render(<ProjectsPage filterDebounceMs={0} />)
      await screen.findByRole('heading', { name: 'P1' })
      await userEvent.click(screen.getByRole('button', { name: 'Página 2' }))
      await screen.findByRole('heading', { name: 'P2' })

      await userEvent.click(await screen.findByRole('checkbox', { name: 'México' }))
      await userEvent.click(screen.getByRole('checkbox', { name: 'Pausado' }))
      await userEvent.click(screen.getByRole('checkbox', { name: 'Abierto' }))
      await waitFor(() =>
        expect(lastOptions()).toMatchObject({
          page: 1,
          filters: { status: ['paused', 'open'], country: ['México'], region: [], responsible: [] },
        }),
      )

      unmount()
      render(<ProjectsPage filterDebounceMs={0} />)
      expect(await screen.findByRole('checkbox', { name: 'México' })).toBeChecked()
      expect(screen.getByRole('checkbox', { name: 'Pausado' })).toBeChecked()
      expect(lastOptions().filters.country).toEqual(['México'])
    })

    it('debounces quick changes into a single query', async () => {
      getProjects.mockResolvedValue(page([project('1', 'Uno')]))
      render(<ProjectsPage filterDebounceMs={80} />)
      await screen.findByRole('heading', { name: 'Uno' })
      const before = getProjects.mock.calls.length
      await userEvent.click(screen.getByRole('checkbox', { name: 'Abierto' }))
      await userEvent.click(screen.getByRole('checkbox', { name: 'Cerrado' }))
      expect(getProjects.mock.calls.length).toBe(before)
      await waitFor(() => expect(lastOptions().filters.status).toEqual(['open', 'closed']))
      expect(getProjects.mock.calls.length).toBe(before + 1)
    })

    it('clears filters immediately', async () => {
      getProjects.mockResolvedValue(page([project('1', 'Uno')]))
      render(<ProjectsPage filterDebounceMs={0} />)
      await userEvent.click(await screen.findByRole('checkbox', { name: 'México' }))
      await waitFor(() => expect(lastOptions().filters.country).toEqual(['México']))
      await userEvent.click(screen.getByRole('button', { name: 'Limpiar' }))
      await waitFor(() => expect(lastOptions().filters.country).toEqual([]))
      expect(screen.getByRole('checkbox', { name: 'México' })).not.toBeChecked()
    })

    it('shows a no-match state with a clear action when filters leave no results', async () => {
      getProjects.mockImplementation(async ({ filters }: { filters: { country: string[] } }) =>
        page(filters.country.length ? [] : [project('1', 'Uno')]),
      )
      render(<ProjectsPage filterDebounceMs={0} />)
      await screen.findByRole('heading', { name: 'Uno' })
      await userEvent.click(await screen.findByRole('checkbox', { name: 'México' }))
      expect(await screen.findByText('Ningún proyecto coincide con los filtros')).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
      expect(await screen.findByRole('heading', { name: 'Uno' })).toBeInTheDocument()
    })

    it('can toggle the filters panel on small screens', async () => {
      getProjects.mockResolvedValue(page([project('1', 'Uno')]))
      render(<ProjectsPage />)
      await screen.findByRole('heading', { name: 'Uno' })
      const toggle = screen.getByRole('button', { name: /^Filtros/ })
      expect(toggle).toHaveAttribute('aria-expanded', 'false')
      await userEvent.click(toggle)
      expect(toggle).toHaveAttribute('aria-expanded', 'true')
    })
  })

  describe('detail navigation', () => {
    it('links each card to its detail and remembers it was opened from the list', async () => {
      getProjects.mockResolvedValue(page([project('p1', 'Uno')]))
      render(<ProjectsPage />)
      const link = await screen.findByRole('link', { name: 'Uno' })
      expect(link).toHaveAttribute('href', '#/proyectos/p1')
      Object.defineProperty(window, 'scrollY', { value: 250, configurable: true })
      await userEvent.click(link)
      expect(loadOpenedFromList()).toBe(true)
      expect(loadScroll()).toBe(250)
    })

    it('restores the page where the user was', async () => {
      getProjects.mockImplementation(async ({ page: p }: { page: number }) =>
        page([project(`${p}`, `P${p}`)], p, 3),
      )
      const { unmount } = render(<ProjectsPage />)
      await screen.findByRole('heading', { name: 'P1' })
      await userEvent.click(screen.getByRole('button', { name: 'Página 3' }))
      await screen.findByRole('heading', { name: 'P3' })
      unmount()

      render(<ProjectsPage />)
      expect(await screen.findByRole('heading', { name: 'P3' })).toBeInTheDocument()
      expect(lastOptions().page).toBe(3)
    })

    it('restores the scroll after the list loads when coming back', async () => {
      getProjects.mockResolvedValue(page([project('p1', 'Uno')]))
      markOpenedFromList(240)
      render(<ProjectsPage />)
      await screen.findByRole('heading', { name: 'Uno' })
      await waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith(0, 240))
      expect(loadScroll()).toBeNull()
    })

    it('does not scroll on a normal visit', async () => {
      getProjects.mockResolvedValue(page([project('p1', 'Uno')]))
      render(<ProjectsPage />)
      await screen.findByRole('heading', { name: 'Uno' })
      expect(window.scrollTo).not.toHaveBeenCalled()
    })
  })
})
