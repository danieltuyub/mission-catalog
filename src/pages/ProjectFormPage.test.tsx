import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const svc = vi.hoisted(() => ({ createProjectWithImages: vi.fn() }))
vi.mock('../services/projectAdmin', () => svc)
vi.mock('../components/ProjectForm', () => ({
  default: ({ onSubmit, onCancel }: { onSubmit: (d: unknown) => Promise<void>; onCancel: () => void }) => (
    <div>
      <button onClick={() => onSubmit({ project: { name: 'Nuevo' }, images: [] })}>guardar</button>
      <button onClick={onCancel}>cancelar</button>
    </div>
  ),
}))

import ProjectFormPage from './ProjectFormPage'

beforeEach(() => svc.createProjectWithImages.mockReset().mockResolvedValue({ id: 'p9' }))
afterEach(() => {
  window.location.hash = ''
})

describe('ProjectFormPage', () => {
  it('saves to the new project and goes back to the public list by default', async () => {
    window.location.hash = '#/proyectos/nuevo'
    render(<ProjectFormPage />)
    expect(screen.getByRole('link', { name: /Proyectos/ })).toHaveAttribute('href', '#/proyectos')
    await userEvent.click(screen.getByText('guardar'))
    expect(window.location.hash).toBe('#/proyectos/p9')
    window.location.hash = '#/proyectos/nuevo'
    await userEvent.click(screen.getByText('cancelar'))
    expect(window.location.hash).toBe('#/proyectos')
  })

  it('opened from the admin panel, saving and cancelling both lead back to it', async () => {
    window.location.hash = '#/proyectos/nuevo?from=admin'
    render(<ProjectFormPage />)
    expect(screen.getByRole('link', { name: /Administración/ })).toHaveAttribute('href', '#/admin/proyectos')
    await userEvent.click(screen.getByText('guardar'))
    expect(window.location.hash).toBe('#/admin/proyectos')
    window.location.hash = '#/proyectos/nuevo?from=admin'
    await userEvent.click(screen.getByText('cancelar'))
    expect(window.location.hash).toBe('#/admin/proyectos')
  })
})
