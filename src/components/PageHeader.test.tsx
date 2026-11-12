import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PageHeader from './PageHeader'

describe('PageHeader', () => {
  it('renders the title as an h1 with badge and actions', () => {
    render(
      <PageHeader title="Proyectos" badge={<span>30</span>}>
        <button type="button">Acción</button>
      </PageHeader>,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Proyectos' })).toBeInTheDocument()
    expect(screen.getByText('30')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Acción' })).toBeInTheDocument()
  })

  it('works with only a title', () => {
    render(<PageHeader title="Contacto" />)
    expect(screen.getByRole('heading', { name: 'Contacto' })).toBeInTheDocument()
  })
})
