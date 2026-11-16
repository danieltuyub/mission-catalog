import { render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The sections have their own tests: here only the shell.
vi.mock('./account/MessagesSection', () => ({ default: () => <p>sección mensajes</p> }))
vi.mock('./account/RequestsSection', () => ({ default: () => <p>sección solicitudes</p> }))
vi.mock('./account/ProjectsSection', () => ({ default: () => <p>sección proyectos</p> }))
vi.mock('./account/ProfileSection', () => ({ default: () => <p>sección perfil</p> }))

import { getAuthSnapshot } from '../services/authService'
import { useUnreadMessages } from '../hooks/useUnreadMessages'
import { CREATOR, SIGNED_OUT, SUBSCRIBER } from '../test/auth'
import AccountPage from './AccountPage'

vi.mock('../hooks/useUnreadMessages', () => ({ useUnreadMessages: vi.fn(() => 0) }))

const chips = () => within(screen.getByRole('navigation', { name: 'Mi espacio' }))

beforeEach(() => {
  vi.mocked(getAuthSnapshot).mockReturnValue(SUBSCRIBER)
  vi.mocked(useUnreadMessages).mockReturnValue(0)
})
afterEach(() => {
  vi.mocked(getAuthSnapshot).mockReturnValue(SIGNED_OUT)
  window.location.hash = ''
})

describe('AccountPage', () => {
  it('sends signed-out visitors to the login', () => {
    vi.mocked(getAuthSnapshot).mockReturnValue(SIGNED_OUT)
    window.location.hash = '#/cuenta'
    render(<AccountPage />)
    expect(screen.queryByRole('heading', { name: 'Mi espacio' })).not.toBeInTheDocument()
    expect(window.location.hash).toBe('#/login?next=%2Fcuenta')
  })

  it('opens Mensajes from #/cuenta', async () => {
    window.location.hash = '#/cuenta'
    render(<AccountPage />)
    await waitFor(() => expect(window.location.hash).toBe('#/cuenta/mensajes'))
    expect(await screen.findByText('sección mensajes')).toBeInTheDocument()
  })

  it('goes to the first available section when the one asked for does not exist or is not allowed', async () => {
    vi.mocked(getAuthSnapshot).mockReturnValue({ ...SUBSCRIBER, permissions: [] })
    window.location.hash = '#/cuenta/solicitudes'
    render(<AccountPage />)
    await waitFor(() => expect(window.location.hash).toBe('#/cuenta/perfil'))
    expect(await screen.findByText('sección perfil')).toBeInTheDocument()
  })

  it('lists the sections the account may use and marks the current one', () => {
    window.location.hash = '#/cuenta/solicitudes'
    render(<AccountPage />)
    expect(chips().getAllByRole('link').map((l) => l.textContent)).toEqual(['Mensajes', 'Solicitudes de pines', 'Proyectos', 'Mi cuenta'])
    expect(chips().getByRole('link', { name: 'Solicitudes de pines' })).toHaveAttribute('aria-current', 'page')
    expect(chips().getByRole('link', { name: 'Mensajes' })).toHaveAttribute('href', '#/cuenta/mensajes')
    expect(screen.getByText('sección solicitudes')).toBeInTheDocument()
  })

  it('hides what the account cannot do', () => {
    vi.mocked(getAuthSnapshot).mockReturnValue({ ...CREATOR, permissions: ['projects.save'] })
    window.location.hash = '#/cuenta/proyectos'
    render(<AccountPage />)
    expect(chips().getAllByRole('link').map((l) => l.textContent)).toEqual(['Proyectos', 'Mi cuenta'])
  })

  it('shows the unread count on Mensajes', () => {
    vi.mocked(useUnreadMessages).mockReturnValue(12)
    window.location.hash = '#/cuenta/perfil'
    render(<AccountPage />)
    expect(chips().getByRole('link', { name: /Mensajes/ })).toHaveTextContent('9+')
  })
})
