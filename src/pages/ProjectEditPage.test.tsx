import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ProjectEditPage from './ProjectEditPage'
import { SKELETON_DELAY_MS } from './projectsConfig'

const getProjectById = vi.hoisted(() => vi.fn())
vi.mock('../services/projectService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/projectService')>()),
  getProjectById,
}))

const updateProjectWithImages = vi.hoisted(() => vi.fn())
vi.mock('../services/projectAdmin', () => ({ updateProjectWithImages }))

const project = { id: 'abc', name: 'Casa Norte', status: 'open' }

beforeEach(() => {
  vi.useFakeTimers()
  getProjectById.mockReset()
  updateProjectWithImages.mockReset()
  updateProjectWithImages.mockResolvedValue(undefined)
  window.location.hash = ''
})
afterEach(() => {
  vi.useRealTimers()
})

describe('ProjectEditPage loading', () => {
  it('keeps the placeholder invisible for quick loads, then fades the form in', async () => {
    let resolve!: (p: unknown) => void
    getProjectById.mockReturnValue(new Promise((r) => (resolve = r)))
    render(<ProjectEditPage id="abc" />)
    const placeholder = screen.getByRole('status', { name: 'Cargando proyecto' })
    expect(placeholder).toHaveClass('opacity-0')
    expect(screen.getByRole('heading', { name: 'Editar proyecto' })).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(SKELETON_DELAY_MS)
    })
    expect(placeholder).not.toHaveClass('opacity-0')

    await act(async () => resolve(project))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    const form = screen.getByRole('form', { name: 'Editar proyecto' })
    expect(form.parentElement).toHaveClass('animate-fade-in')
  })

  it('scrolls to the top on entry', async () => {
    getProjectById.mockResolvedValue(project)
    render(<ProjectEditPage id="abc" />)
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
  })

  it('shows a message when the project does not exist', async () => {
    getProjectById.mockResolvedValue(null)
    render(<ProjectEditPage id="abc" />)
    await act(async () => {})
    expect(screen.getByText('No existe un proyecto con ese enlace.')).toBeInTheDocument()
  })
})

describe('ProjectEditPage navigation', () => {
  const open = async (hash: string) => {
    window.location.hash = hash
    getProjectById.mockResolvedValue(project)
    render(<ProjectEditPage id="abc" />)
    await act(async () => {})
  }
  const press = (name: string) =>
    act(async () => {
      fireEvent.click(screen.getByRole('button', { name }))
    })

  it('returns to the project detail by default', async () => {
    await open('#/proyectos/abc/editar')
    expect(screen.getByRole('link', { name: 'Proyecto' })).toHaveAttribute('href', '#/proyectos/abc')
    await press('Cancelar')
    expect(window.location.hash).toBe('#/proyectos/abc')
  })

  it('cancels back to the list when opened from it', async () => {
    await open('#/proyectos/abc/editar?from=lista')
    expect(screen.getByRole('link', { name: 'Proyectos' })).toHaveAttribute('href', '#/proyectos')
    await press('Cancelar')
    expect(window.location.hash).toBe('#/proyectos')
  })

  it('saves and returns to the list when opened from it', async () => {
    await open('#/proyectos/abc/editar?from=lista')
    await press('Guardar cambios')
    expect(updateProjectWithImages).toHaveBeenCalledWith('abc', expect.objectContaining({ name: 'Casa Norte' }), [])
    expect(window.location.hash).toBe('#/proyectos')
  })

  it('saves and returns to the detail by default', async () => {
    await open('#/proyectos/abc/editar')
    await press('Guardar cambios')
    expect(window.location.hash).toBe('#/proyectos/abc')
  })

  it('ignores an unknown origin', async () => {
    await open('#/proyectos/abc/editar?from=otro')
    await press('Cancelar')
    expect(window.location.hash).toBe('#/proyectos/abc')
  })
})
