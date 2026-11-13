import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

  describe('session', () => {
    const signedOut = { loading: false, email: null, isAdmin: false }
    const signedIn = { loading: false, email: 'a@b.com', isAdmin: true }
    // The panel stays mounted (so it can animate); `inert` marks it closed.
    const panel = () => document.getElementById('user-menu')!
    afterEach(() => {
      vi.mocked(getAuthSnapshot).mockReturnValue(signedOut)
      window.location.hash = ''
    })

    it('offers the login at the end of the menu when signed out', () => {
      render(<Navbar current="mapa" />)
      const links = within(screen.getByRole('navigation', { name: 'Principal' })).getAllByRole('link')
      expect(links.at(-1)).toHaveTextContent('Iniciar sesión')
      expect(links.at(-1)).toHaveAttribute('href', '#/login')
      expect(screen.queryByRole('button', { name: 'Menú de usuario' })).not.toBeInTheDocument()
    })

    it('shows neither the login nor the user menu while the session is loading', () => {
      vi.mocked(getAuthSnapshot).mockReturnValue({ loading: true, email: null, isAdmin: false })
      render(<Navbar current="mapa" />)
      expect(screen.queryByRole('link', { name: 'Iniciar sesión' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Menú de usuario' })).not.toBeInTheDocument()
    })

    it('hides the login link and keeps the email out of sight until the user menu opens', async () => {
      vi.mocked(getAuthSnapshot).mockReturnValue(signedIn)
      render(<Navbar current="mapa" />)
      expect(screen.queryByRole('link', { name: 'Iniciar sesión' })).not.toBeInTheDocument()
      expect(panel()).toHaveAttribute('inert')
      const trigger = screen.getByRole('button', { name: 'Menú de usuario' })
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      await userEvent.click(trigger)
      expect(trigger).toHaveAttribute('aria-expanded', 'true')
      expect(panel()).not.toHaveAttribute('inert')
      expect(screen.getByText('a@b.com')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument()
    })

    it('closes the user menu with Escape (returning focus) and with an outside click', async () => {
      vi.mocked(getAuthSnapshot).mockReturnValue(signedIn)
      render(<Navbar current="mapa" />)
      const trigger = screen.getByRole('button', { name: 'Menú de usuario' })
      await userEvent.click(trigger)
      await userEvent.keyboard('{Escape}')
      expect(panel()).toHaveAttribute('inert')
      expect(trigger).toHaveFocus()

      await userEvent.click(trigger)
      expect(panel()).not.toHaveAttribute('inert')
      await userEvent.click(document.body)
      expect(panel()).toHaveAttribute('inert')
    })

    it('signs out from the menu and goes to the map', async () => {
      vi.mocked(getAuthSnapshot).mockReturnValue(signedIn)
      vi.mocked(signOut).mockResolvedValue(undefined)
      window.location.hash = '#/proyectos'
      render(<Navbar current="proyectos" />)
      await userEvent.click(screen.getByRole('button', { name: 'Menú de usuario' }))
      await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
      expect(signOut).toHaveBeenCalled()
      await vi.waitFor(() => expect(window.location.hash).toBe('#/mapa'))
      expect(panel()).toHaveAttribute('inert')
    })

    it('never keeps the mobile menu and the user menu open together', async () => {
      vi.mocked(getAuthSnapshot).mockReturnValue(signedIn)
      render(<Navbar current="mapa" />)
      await userEvent.click(screen.getByRole('button', { name: 'Menú de usuario' }))
      await userEvent.click(screen.getByRole('button', { name: 'Abrir menú' }))
      expect(panel()).toHaveAttribute('inert')
      await userEvent.click(screen.getByRole('button', { name: 'Menú de usuario' }))
      expect(screen.getByRole('button', { name: 'Abrir menú' })).toHaveAttribute('aria-expanded', 'false')
    })
  })
})
