import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAuthSnapshot } from '../services/authService'
import { ADMIN, CREATOR, LOADING, SIGNED_OUT, SUBSCRIBER } from '../test/auth'
import RequireAuth from './RequireAuth'

const as = (state: typeof SIGNED_OUT) => vi.mocked(getAuthSnapshot).mockReturnValue(state)

afterEach(() => {
  window.location.hash = ''
  as(SIGNED_OUT)
})

describe('RequireAuth', () => {
  it('renders nothing while loading', () => {
    as(LOADING)
    window.location.hash = '#/proyectos/nuevo'
    const { container } = render(<RequireAuth permission="projects.create">secreto</RequireAuth>)
    expect(container).toBeEmptyDOMElement()
    expect(window.location.hash).toBe('#/proyectos/nuevo')
  })

  it('sends signed-out visitors to the login and remembers the page', () => {
    window.location.hash = '#/proyectos/nuevo'
    render(<RequireAuth permission="projects.create">secreto</RequireAuth>)
    expect(screen.queryByText('secreto')).not.toBeInTheDocument()
    expect(window.location.hash).toBe('#/login?next=%2Fproyectos%2Fnuevo')
  })

  it('denies signed-in users without the permission', () => {
    as(SUBSCRIBER)
    render(<RequireAuth permission="projects.create">secreto</RequireAuth>)
    expect(screen.queryByText('secreto')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('No tienes permiso')
  })

  it('renders children for users with the permission', () => {
    as(CREATOR)
    render(<RequireAuth permission="projects.create">secreto</RequireAuth>)
    expect(screen.getByText('secreto')).toBeInTheDocument()
  })

  it('accepts any one of several permissions', () => {
    as(CREATOR)
    render(<RequireAuth permission={['projects.update_any', 'projects.update_own']}>secreto</RequireAuth>)
    expect(screen.getByText('secreto')).toBeInTheDocument()
  })

  it('without a permission, lets in any signed-in user and still redirects guests', () => {
    as(SUBSCRIBER)
    const { unmount } = render(<RequireAuth>secreto</RequireAuth>)
    expect(screen.getByText('secreto')).toBeInTheDocument()
    unmount()

    as(SIGNED_OUT)
    window.location.hash = '#/cuenta'
    render(<RequireAuth>secreto</RequireAuth>)
    expect(window.location.hash).toBe('#/login?next=%2Fcuenta')
  })

  it('lets admins through everywhere', () => {
    as(ADMIN)
    render(<RequireAuth permission="anything.at.all">secreto</RequireAuth>)
    expect(screen.getByText('secreto')).toBeInTheDocument()
  })
})
