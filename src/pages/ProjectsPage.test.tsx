import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Project } from '../types'

const getProjects = vi.hoisted(() => vi.fn())
vi.mock('../services/projectService', () => ({ getProjects }))

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

const page = (data: Project[]) => ({ data, total: data.length, page: 1, pageSize: 4, totalPages: 1 })

describe('ProjectsPage', () => {
  beforeEach(() => {
    getProjects.mockReset()
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
})
