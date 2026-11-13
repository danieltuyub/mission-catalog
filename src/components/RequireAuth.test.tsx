import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAuthSnapshot } from '../services/authService'
import RequireAuth from './RequireAuth'

const state = (s: { loading: boolean; email: string | null; isAdmin: boolean }) =>
  vi.mocked(getAuthSnapshot).mockReturnValue(s)

afterEach(() => {
  window.location.hash = ''
  state({ loading: false, email: null, isAdmin: false })
})

describe('RequireAuth', () => {
  it('renders nothing while loading', () => {
    state({ loading: true, email: null, isAdmin: false })
    window.location.hash = '#/proyectos/nuevo'
    const { container } = render(<RequireAuth>secreto</RequireAuth>)
    expect(container).toBeEmptyDOMElement()
    expect(window.location.hash).toBe('#/proyectos/nuevo')
  })

  it('sends signed-out visitors to the login and remembers the page', () => {
    window.location.hash = '#/proyectos/nuevo'
    render(<RequireAuth>secreto</RequireAuth>)
    expect(screen.queryByText('secreto')).not.toBeInTheDocument()
    expect(window.location.hash).toBe('#/login?next=%2Fproyectos%2Fnuevo')
  })

  it('denies signed-in users who are not admins', () => {
    state({ loading: false, email: 'a@b.com', isAdmin: false })
    render(<RequireAuth>secreto</RequireAuth>)
    expect(screen.queryByText('secreto')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('No tienes permiso')
  })

  it('renders children for admins', () => {
    state({ loading: false, email: 'a@b.com', isAdmin: true })
    render(<RequireAuth>secreto</RequireAuth>)
    expect(screen.getByText('secreto')).toBeInTheDocument()
  })
})
