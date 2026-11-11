import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Project } from '../types'

const getProjects = vi.hoisted(() => vi.fn())
vi.mock('../services/projectService', () => ({ getProjects, DEFAULT_PAGE_SIZE: 3 }))

import { clearPageSize } from '../services/projectsViewStorage'
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

describe('ProjectsPage', () => {
  beforeEach(() => {
    getProjects.mockReset()
    clearPageSize()
  })

  it('lists projects from the service', async () => {
    getProjects.mockResolvedValue(page([project('1', 'Uno'), project('2', 'Dos')]))
    render(<ProjectsPage />)
    expect(screen.getByText('Cargando proyectos…')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Uno' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Dos' })).toBeInTheDocument()
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
    getProjects.mockImplementation(async (p: number) =>
      p === 1 ? page([project('1', 'Uno')], 1, 2) : page([project('5', 'Cinco')], 2, 2),
    )
    render(<ProjectsPage />)
    expect(await screen.findByRole('heading', { name: 'Uno' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Página 2' }))
    expect(await screen.findByRole('heading', { name: 'Cinco' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Uno' })).not.toBeInTheDocument()
    expect(getProjects).toHaveBeenLastCalledWith(2, 3)
  })

  it('uses the pageSize prop', async () => {
    getProjects.mockResolvedValue(page([project('1', 'Uno')]))
    render(<ProjectsPage pageSize={6} />)
    await screen.findByRole('heading', { name: 'Uno' })
    expect(getProjects).toHaveBeenCalledWith(1, 6)
  })

  it('changes the page size, goes back to page 1 and remembers it', async () => {
    getProjects.mockImplementation(async (p: number, size: number) =>
      page([project(`${p}-${size}`, `P${p}-${size}`)], p, 3),
    )
    const { unmount } = render(<ProjectsPage />)
    await screen.findByRole('heading', { name: 'P1-3' })
    await userEvent.click(screen.getByRole('button', { name: 'Página 2' }))
    await screen.findByRole('heading', { name: 'P2-3' })

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Proyectos por página' }), '6')
    expect(await screen.findByRole('heading', { name: 'P1-6' })).toBeInTheDocument()
    expect(getProjects).toHaveBeenLastCalledWith(1, 6)

    unmount()
    render(<ProjectsPage />)
    expect(await screen.findByRole('heading', { name: 'P1-6' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Proyectos por página' })).toHaveValue('6')
  })

  it('reserves space for the minimum number of cards', async () => {
    getProjects.mockResolvedValue(page([project('1', 'Uno')]))
    render(<ProjectsPage minSlots={3} />)
    await screen.findByRole('heading', { name: 'Uno' })
    const list = screen.getByRole('list')
    expect(list.style.getPropertyValue('--reserved')).toBe('calc(3 * 14rem + 2 * 1.25rem)')
  })
})
