import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
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
  it('shows name, description and details', () => {
    render(<ProjectCard project={base} />)
    expect(screen.getByRole('heading', { name: 'Iglesia Norte' })).toBeInTheDocument()
    expect(screen.getByText('Una iglesia en casa')).toBeInTheDocument()
    for (const v of ['México', 'Yucatán', '999 123 4567', 'norte@example.com']) {
      expect(screen.getByText(v)).toBeInTheDocument()
    }
  })

  it('does not render phone and mail as links', () => {
    render(<ProjectCard project={base} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('fills missing values with dashes', () => {
    render(
      <ProjectCard
        project={{ ...base, country: null, region: null, phone: null, mail: null, description: null }}
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
