import { render, screen } from '@testing-library/react'
import { ADMIN } from '../test/auth'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getAuthSnapshot, signIn } from '../services/authService'
import LoginPage from './LoginPage'

beforeEach(() => {
  vi.mocked(signIn).mockReset()
})
afterEach(() => {
  window.location.hash = ''
})

async function fill(email = 'a@b.com', password = 'secret') {
  await userEvent.type(screen.getByLabelText('Correo'), email)
  await userEvent.type(screen.getByLabelText('Contraseña'), password)
}

describe('LoginPage', () => {
  it('signs in with trimmed email and password', async () => {
    vi.mocked(signIn).mockResolvedValue(undefined)
    render(<LoginPage />)
    await fill(' a@b.com ')
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    expect(signIn).toHaveBeenCalledWith('a@b.com', 'secret')
  })

  it('shows the error and re-enables the button', async () => {
    vi.mocked(signIn).mockRejectedValue(new Error('Correo o contraseña incorrectos'))
    render(<LoginPage />)
    await fill()
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos')
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeEnabled()
  })

  it('disables the button while submitting', async () => {
    vi.mocked(signIn).mockReturnValue(new Promise(() => {}))
    render(<LoginPage />)
    await fill()
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    expect(screen.getByRole('button', { name: 'Iniciando sesión…' })).toBeDisabled()
  })

  it('shows the error above the submit button', async () => {
    vi.mocked(signIn).mockRejectedValue(new Error('Correo o contraseña incorrectos'))
    render(<LoginPage />)
    await fill()
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    const alert = await screen.findByRole('alert')
    const submit = screen.getByRole('button', { name: 'Iniciar sesión' })
    expect(alert.compareDocumentPosition(submit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  describe('autofocus', () => {
    const original = window.matchMedia
    afterEach(() => {
      window.matchMedia = original
    })

    it('focuses the email on devices with a pointer', () => {
      window.matchMedia = vi.fn(() => ({ matches: true })) as unknown as typeof window.matchMedia
      render(<LoginPage />)
      expect(screen.getByLabelText('Correo')).toHaveFocus()
    })

    it('does not open the keyboard on touch devices', () => {
      window.matchMedia = vi.fn(() => ({ matches: false })) as unknown as typeof window.matchMedia
      render(<LoginPage />)
      expect(screen.getByLabelText('Correo')).not.toHaveFocus()
    })
  })

  it('toggles password visibility', async () => {
    render(<LoginPage />)
    const field = screen.getByLabelText('Contraseña')
    expect(field).toHaveAttribute('type', 'password')
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
    expect(field).toHaveAttribute('type', 'text')
    await userEvent.click(screen.getByRole('button', { name: 'Ocultar contraseña' }))
    expect(field).toHaveAttribute('type', 'password')
  })

  it('returns to the requested page after signing in', () => {
    window.location.hash = '#/login?next=%2Fproyectos%2Fnuevo'
    vi.mocked(getAuthSnapshot).mockReturnValueOnce(ADMIN)
    render(<LoginPage />)
    expect(window.location.hash).toBe('#/proyectos/nuevo')
  })

  it('leaves for Proyectos when already signed in', () => {
    vi.mocked(getAuthSnapshot).mockReturnValueOnce(ADMIN)
    render(<LoginPage />)
    expect(window.location.hash).toBe('#/proyectos')
  })
})
