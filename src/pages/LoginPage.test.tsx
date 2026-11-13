import { render, screen } from '@testing-library/react'
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
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(signIn).toHaveBeenCalledWith('a@b.com', 'secret')
  })

  it('shows the error and re-enables the button', async () => {
    vi.mocked(signIn).mockRejectedValue(new Error('Correo o contraseña incorrectos'))
    render(<LoginPage />)
    await fill()
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos')
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled()
  })

  it('disables the button while submitting', async () => {
    vi.mocked(signIn).mockReturnValue(new Promise(() => {}))
    render(<LoginPage />)
    await fill()
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(screen.getByRole('button', { name: 'Entrando…' })).toBeDisabled()
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
    vi.mocked(getAuthSnapshot).mockReturnValueOnce({ loading: false, email: 'a@b.com', isAdmin: true })
    render(<LoginPage />)
    expect(window.location.hash).toBe('#/proyectos/nuevo')
  })

  it('leaves for Proyectos when already signed in', () => {
    vi.mocked(getAuthSnapshot).mockReturnValueOnce({ loading: false, email: 'a@b.com', isAdmin: true })
    render(<LoginPage />)
    expect(window.location.hash).toBe('#/proyectos')
  })
})
