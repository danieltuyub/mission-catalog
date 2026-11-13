import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { getAuthSnapshot, signOut } from '../services/authService'
import Navbar from './Navbar'

describe('Navbar', () => {
  it('marks the current route', () => {
    render(<Navbar current="proyectos" />)
    expect(screen.getByRole('link', { name: 'Proyectos' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Mapa' })).not.toHaveAttribute('aria-current')
  })

  it('toggles the mobile menu and closes with Escape', async () => {
    render(<Navbar current="mapa" />)
    const toggle = screen.getByRole('button', { name: 'Abrir menú' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(toggle)
    expect(screen.getByRole('button', { name: 'Cerrar menú' })).toHaveAttribute('aria-expanded', 'true')
    await userEvent.keyboard('{Escape}')
    expect(screen.getByRole('button', { name: 'Abrir menú' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('shows no session controls when signed out', () => {
    render(<Navbar current="mapa" />)
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).not.toBeInTheDocument()
  })

  it('shows the email and signs out', async () => {
    vi.mocked(getAuthSnapshot).mockReturnValue({ loading: false, email: 'a@b.com', isAdmin: true })
    vi.mocked(signOut).mockResolvedValue(undefined)
    render(<Navbar current="mapa" />)
    expect(screen.getByText('a@b.com')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(signOut).toHaveBeenCalled()
    await vi.waitFor(() => expect(window.location.hash).toBe('#/mapa'))
    vi.mocked(getAuthSnapshot).mockReturnValue({ loading: false, email: null, isAdmin: false })
  })
})
