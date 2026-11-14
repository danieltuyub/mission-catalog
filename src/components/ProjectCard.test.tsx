import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Project } from '../types'
import ProjectCard from './ProjectCard'

const base: Project = {
  id: '1',
  name: 'Iglesia Norte',
  responsible: 'Ana',
  description: 'Una iglesia en casa',
  started_at: '2026-01-01',
  country: 'México',
  region: 'Yucatán',
  phone: '999 123 4567',
  mail: 'norte@example.com',
  status: 'open',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('ProjectCard', () => {
  it('does not show phone or mail', () => {
    render(<ProjectCard project={base} />)
    expect(screen.queryByText('Teléfono')).not.toBeInTheDocument()
    expect(screen.queryByText('Mail')).not.toBeInTheDocument()
    expect(screen.queryByText('999 123 4567')).not.toBeInTheDocument()
    expect(screen.queryByText('norte@example.com')).not.toBeInTheDocument()
  })

  it('shows name, description and details', () => {
    render(<ProjectCard project={base} />)
    expect(screen.getByRole('heading', { name: 'Iglesia Norte' })).toBeInTheDocument()
    expect(screen.getByText('Una iglesia en casa')).toBeInTheDocument()
    for (const v of ['México', 'Yucatán', 'Ana', '1 de enero de 2026']) {
      expect(screen.getByText(v)).toBeInTheDocument()
    }
  })

  it('links to the project detail', () => {
    render(<ProjectCard project={base} />)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute('href', '#/proyectos/1')
    expect(links[0]).toHaveTextContent('Iglesia Norte')
  })

  it('calls onOpen on a plain click but not on a modified click', async () => {
    const onOpen = vi.fn()
    render(<ProjectCard project={base} onOpen={onOpen} />)
    const link = screen.getByRole('link')
    await userEvent.click(link)
    expect(onOpen).toHaveBeenCalledTimes(1)
    fireEvent.click(link, { ctrlKey: true })
    fireEvent.click(link, { metaKey: true })
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('shows the first photo by position as cover, or a placeholder', () => {
    const { container, rerender } = render(<ProjectCard project={base} />)
    expect(container.querySelector('img')).toBeNull()
    rerender(
      <ProjectCard
        project={{
          ...base,
          project_images: [
            { id: 'b', path: 'b.webp', position: 1, alt: null },
            { id: 'a', path: 'a.webp', position: 0, alt: null },
          ],
        }}
      />,
    )
    expect(container.querySelector('img')).toHaveAttribute('src', expect.stringContaining('a.webp'))
  })

  it('shows the edit icon only when editable, as its own link', async () => {
    const onOpen = vi.fn()
    const { rerender } = render(<ProjectCard project={base} onOpen={onOpen} />)
    expect(screen.queryByRole('link', { name: 'Editar proyecto' })).not.toBeInTheDocument()
    rerender(<ProjectCard project={base} onOpen={onOpen} editable />)
    const edit = screen.getByRole('link', { name: 'Editar proyecto' })
    expect(edit).toHaveAttribute('href', '#/proyectos/1/editar?from=lista')
    await userEvent.click(edit)
    expect(onOpen).not.toHaveBeenCalled()
  })

  describe('save heart', () => {
    it('is not shown without a handler', () => {
      render(<ProjectCard project={base} />)
      expect(screen.queryByRole('button', { name: 'Guardar proyecto' })).not.toBeInTheDocument()
    })

    it('reflects the saved state and calls the handler without opening the card', async () => {
      const onToggleSaved = vi.fn()
      const onOpen = vi.fn()
      const { rerender } = render(<ProjectCard project={base} onToggleSaved={onToggleSaved} onOpen={onOpen} />)
      const heart = screen.getByRole('button', { name: 'Guardar proyecto' })
      expect(heart).toHaveAttribute('aria-pressed', 'false')
      expect(heart).toHaveAttribute('title', 'Guardar proyecto')
      await userEvent.click(heart)
      expect(onToggleSaved).toHaveBeenCalledOnce()
      expect(onOpen).not.toHaveBeenCalled()

      rerender(<ProjectCard project={base} saved onToggleSaved={onToggleSaved} />)
      expect(screen.getByRole('button', { name: 'Guardar proyecto' })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('button', { name: 'Guardar proyecto' })).toHaveAttribute('title', 'Quitar de guardados')
    })

    it('can be disabled while loading', () => {
      render(<ProjectCard project={base} onToggleSaved={() => {}} saveDisabled />)
      expect(screen.getByRole('button', { name: 'Guardar proyecto' })).toBeDisabled()
    })

    it('sits next to the edit icon, before it', () => {
      render(<ProjectCard project={base} editable onToggleSaved={() => {}} />)
      const heart = screen.getByRole('button', { name: 'Guardar proyecto' })
      const edit = screen.getByRole('link', { name: 'Editar proyecto' })
      expect(heart.compareDocumentPosition(edit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })
  })

  it('fills missing values with dashes', () => {
    render(
      <ProjectCard
        project={{ ...base, country: null, region: null, responsible: null, started_at: null, description: null }}
      />,
    )
    expect(screen.getAllByText('—')).toHaveLength(4)
    expect(screen.getByText('Sin descripción')).toBeInTheDocument()
  })

  it.each([
    ['open', 'Abierto', 'bg-green-100'],
    ['paused', 'Pausado', 'bg-yellow-100'],
    ['closed', 'Cerrado', 'bg-red-100'],
  ] as const)('shows %s status chip', (status, label, color) => {
    render(<ProjectCard project={{ ...base, status }} />)
    const chip = screen.getByText(label)
    expect(chip).toHaveClass(color)
    expect(chip.tagName).toBe('SPAN')
  })
})
