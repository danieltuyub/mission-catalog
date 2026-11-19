import { render, screen, within } from '@testing-library/react'
import { ADMIN, LOADING, NAMED, SIGNED_OUT, SUBSCRIBER } from '../test/auth'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getAuthSnapshot, signOut } from '../services/authService'
import { countUnreadContacts } from '../services/contactMessages'
import { countUnreadMessages } from '../services/unreadMessages'
import { getToast } from '../services/toast'
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
    // The panel stays mounted (so it can animate); `inert` marks it closed.
    const panel = () => document.getElementById('user-menu')!
    afterEach(() => {
      vi.mocked(getAuthSnapshot).mockReturnValue(SIGNED_OUT)
      vi.mocked(countUnreadMessages).mockResolvedValue(0)
      vi.mocked(countUnreadContacts).mockResolvedValue(0)
      window.location.hash = ''
    })

    it('hides Contacto from admins, in the menu and in the footer', () => {
      vi.mocked(getAuthSnapshot).mockReturnValue(ADMIN)
      render(<Navbar current="mapa" />)
      expect(screen.queryByRole('link', { name: 'Contacto' })).not.toBeInTheDocument()
      vi.mocked(getAuthSnapshot).mockReturnValue(SUBSCRIBER)
      render(<Navbar current="mapa" />)
      expect(screen.getByRole('link', { name: 'Contacto' })).toBeInTheDocument()
    })

    it('adds the unread contact messages to the badge of an admin', async () => {
      vi.mocked(getAuthSnapshot).mockReturnValue(ADMIN)
      vi.mocked(countUnreadMessages).mockResolvedValue(1)
      vi.mocked(countUnreadContacts).mockResolvedValue(2)
      render(<Navbar current="mapa" />)
      expect(await screen.findByRole('button', { name: /3 mensajes sin leer/ })).toBeInTheDocument()
    })

    it('offers the login at the end of the menu when signed out', () => {
      render(<Navbar current="mapa" />)
      const links = within(screen.getByRole('navigation', { name: 'Principal' })).getAllByRole('link')
      expect(links.at(-1)).toHaveTextContent('Iniciar sesión')
      expect(links.at(-1)).toHaveAttribute('href', '#/login')
      expect(screen.queryByRole('button', { name: 'Menú de usuario' })).not.toBeInTheDocument()
    })

    it('shows neither the login nor the user menu while the session is loading', () => {
      vi.mocked(getAuthSnapshot).mockReturnValue(LOADING)
      render(<Navbar current="mapa" />)
      expect(screen.queryByRole('link', { name: 'Iniciar sesión' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Menú de usuario' })).not.toBeInTheDocument()
    })

    it('hides the login link and keeps the email out of sight until the user menu opens', async () => {
      vi.mocked(getAuthSnapshot).mockReturnValue(ADMIN)
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
      vi.mocked(getAuthSnapshot).mockReturnValue(ADMIN)
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

    it('shows the initials on the button and the name above the email', async () => {
      vi.mocked(getAuthSnapshot).mockReturnValue(NAMED)
      render(<Navbar current="mapa" />)
      const trigger = screen.getByRole('button', { name: 'Menú de usuario de Ana Pérez' })
      expect(trigger).toHaveTextContent('AP')
      await userEvent.click(trigger)
      expect(within(panel()).getByText('Ana Pérez')).toBeInTheDocument()
      expect(within(panel()).getByText('a@b.com')).toBeInTheDocument()
      expect(within(panel()).queryByText('Completa tu nombre')).not.toBeInTheDocument()
      expect(within(panel()).queryByText('Sesión iniciada')).not.toBeInTheDocument()
    })

    it('shows a single initial and just the first name when there is no last name', () => {
      vi.mocked(getAuthSnapshot).mockReturnValue({ ...NAMED, lastName: '' })
      render(<Navbar current="mapa" />)
      expect(screen.getByRole('button', { name: 'Menú de usuario de Ana' })).toHaveTextContent('A')
      expect(within(panel()).getByText('Ana')).toBeInTheDocument()
      expect(within(panel()).queryByText('Completa tu nombre')).not.toBeInTheDocument()
    })

    it('asks to complete the name, linking to the account page, when the profile is empty', async () => {
      vi.mocked(getAuthSnapshot).mockReturnValue(ADMIN)
      render(<Navbar current="mapa" />)
      const nudge = within(panel()).getByRole('link', { name: 'Completa tu nombre' })
      expect(nudge).toHaveAttribute('href', '#/cuenta/perfil')
      expect(within(panel()).getByText('a@b.com')).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Menú de usuario' }))
      await userEvent.click(nudge)
      expect(panel()).toHaveAttribute('inert')
    })

    it('does not nag about the name while the profile is still loading', () => {
      vi.mocked(getAuthSnapshot).mockReturnValue({ ...ADMIN, loading: true })
      render(<Navbar current="mapa" />)
      expect(within(panel()).queryByText('Completa tu nombre')).not.toBeInTheDocument()
    })

    describe('access by role', () => {
      it('gives members their own space', async () => {
        vi.mocked(getAuthSnapshot).mockReturnValue(SUBSCRIBER)
        render(<Navbar current="mapa" />)
        await userEvent.click(screen.getByRole('button', { name: 'Menú de usuario' }))
        const link = screen.getByRole('link', { name: 'Mi espacio' })
        expect(link).toHaveAttribute('href', '#/cuenta')
        expect(screen.queryByRole('link', { name: 'Administración' })).not.toBeInTheDocument()
        await userEvent.click(link)
        expect(panel()).toHaveAttribute('inert')
      })

      it('gives admins the admin area instead', async () => {
        vi.mocked(getAuthSnapshot).mockReturnValue(ADMIN)
        render(<Navbar current="mapa" />)
        await userEvent.click(screen.getByRole('button', { name: 'Menú de usuario' }))
        expect(screen.getByRole('link', { name: 'Administración' })).toHaveAttribute('href', '#/admin')
        expect(screen.queryByRole('link', { name: 'Mi espacio' })).not.toBeInTheDocument()
      })
    })

    describe('unread messages', () => {
      const unreadBadge = (n: number) => vi.mocked(countUnreadMessages).mockResolvedValue(n)

      afterEach(() => vi.mocked(countUnreadMessages).mockResolvedValue(0))

      it('shows nothing without unread messages', async () => {
        vi.mocked(getAuthSnapshot).mockReturnValue(SUBSCRIBER)
        render(<Navbar current="mapa" />)
        await screen.findByRole('button', { name: 'Menú de usuario' })
        expect(screen.queryByText(/sin leer/)).not.toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Mi espacio' })).toBeInTheDocument()
      })

      it('shows the count on the avatar and next to the access, and says it to screen readers', async () => {
        unreadBadge(3)
        vi.mocked(getAuthSnapshot).mockReturnValue(SUBSCRIBER)
        render(<Navbar current="mapa" />)
        const avatar = await screen.findByRole('button', { name: 'Menú de usuario, 3 mensajes sin leer' })
        expect(avatar).toHaveTextContent('3')
        expect(screen.getByLabelText('3 mensajes sin leer')).toHaveTextContent('3')
        // The row's name keeps the label plus the badge.
        expect(screen.getByRole('link', { name: /Mi espacio/ })).toHaveTextContent('3')
      })

      it('uses the singular for one', async () => {
        unreadBadge(1)
        vi.mocked(getAuthSnapshot).mockReturnValue(SUBSCRIBER)
        render(<Navbar current="mapa" />)
        expect(await screen.findByRole('button', { name: 'Menú de usuario, 1 mensaje sin leer' })).toBeInTheDocument()
      })

      it('caps the number at 9+', async () => {
        unreadBadge(25)
        vi.mocked(getAuthSnapshot).mockReturnValue(SUBSCRIBER)
        render(<Navbar current="mapa" />)
        const avatar = await screen.findByRole('button', { name: 'Menú de usuario, 25 mensajes sin leer' })
        expect(avatar).toHaveTextContent('9+')
      })

      it('also shows it to admins, next to their area', async () => {
        unreadBadge(2)
        vi.mocked(getAuthSnapshot).mockReturnValue(ADMIN)
        render(<Navbar current="mapa" />)
        await screen.findByRole('button', { name: 'Menú de usuario, 2 mensajes sin leer' })
        expect(screen.getByRole('link', { name: /Administración/ })).toHaveTextContent('2')
      })
    })

    describe('signing out', () => {
      const signOutFrom = async (hash: string) => {
        vi.mocked(getAuthSnapshot).mockReturnValue(ADMIN)
        window.location.hash = hash
        render(<Navbar current="proyectos" />)
        await userEvent.click(screen.getByRole('button', { name: 'Menú de usuario' }))
        await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
        expect(signOut).toHaveBeenCalled()
        expect(panel()).toHaveAttribute('inert')
      }

      beforeEach(() => vi.mocked(signOut).mockReset().mockResolvedValue(undefined))
      afterEach(() => {
        window.location.hash = ''
      })

      it.each(['#/proyectos', '#/proyectos/abc', '#/proyectos?x=1', '#/mapa', '#/contacto'])(
        'stays on the public page %s and confirms with a toast',
        async (hash) => {
          await signOutFrom(hash)
          await vi.waitFor(() => expect(getToast()?.message).toBe('Sesión cerrada'))
          expect(window.location.hash).toBe(hash)
        },
      )

      it.each(['#/cuenta', '#/cuenta/mensajes', '#/admin', '#/proyectos/nuevo', '#/proyectos/abc/editar'])(
        'leaves the private page %s for the map',
        async (hash) => {
          await signOutFrom(hash)
          await vi.waitFor(() => expect(window.location.hash).toBe('#/mapa'))
          expect(getToast()?.message).toBe('Sesión cerrada')
        },
      )
    })

    it('never keeps the mobile menu and the user menu open together', async () => {
      vi.mocked(getAuthSnapshot).mockReturnValue(ADMIN)
      render(<Navbar current="mapa" />)
      await userEvent.click(screen.getByRole('button', { name: 'Menú de usuario' }))
      await userEvent.click(screen.getByRole('button', { name: 'Abrir menú' }))
      expect(panel()).toHaveAttribute('inert')
      await userEvent.click(screen.getByRole('button', { name: 'Menú de usuario' }))
      expect(screen.getByRole('button', { name: 'Abrir menú' })).toHaveAttribute('aria-expanded', 'false')
    })
  })
})
