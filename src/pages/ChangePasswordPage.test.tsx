import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { completeFirstPassword } = vi.hoisted(() => ({ completeFirstPassword: vi.fn() }))
vi.mock('../services/accountService', () => ({ completeFirstPassword, MIN_PASSWORD_LENGTH: 8 }))

import { signOut } from '../services/authService'
import ChangePasswordPage from './ChangePasswordPage'

const fill = async (password: string, confirm = password) => {
  await userEvent.type(screen.getByLabelText('Nueva contraseña'), password)
  await userEvent.type(screen.getByLabelText('Confirmar contraseña'), confirm)
  await userEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
}

beforeEach(() => {
  completeFirstPassword.mockReset().mockResolvedValue(undefined)
  vi.mocked(signOut).mockReset().mockResolvedValue(undefined)
})

describe('ChangePasswordPage', () => {
  it('saves the chosen password', async () => {
    render(<ChangePasswordPage />)
    await fill('mi-clave-segura')
    expect(completeFirstPassword).toHaveBeenCalledWith('mi-clave-segura')
  })

  it('asks for at least 8 characters, and for both fields to match', async () => {
    render(<ChangePasswordPage />)
    await fill('corta')
    expect(screen.getByRole('alert')).toHaveTextContent('al menos 8 caracteres')
    await userEvent.clear(screen.getByLabelText('Nueva contraseña'))
    await userEvent.clear(screen.getByLabelText('Confirmar contraseña'))
    await fill('mi-clave-segura', 'otra-clave-segura')
    expect(screen.getByRole('alert')).toHaveTextContent('no coinciden')
    expect(completeFirstPassword).not.toHaveBeenCalled()
  })

  it('shows what went wrong and lets the user try again', async () => {
    completeFirstPassword.mockRejectedValue(new Error('La nueva contraseña debe ser distinta de la actual'))
    render(<ChangePasswordPage />)
    await fill('mi-clave-segura')
    expect(await screen.findByRole('alert')).toHaveTextContent('distinta de la actual')
    expect(screen.getByRole('button', { name: 'Guardar contraseña' })).toBeEnabled()
  })

  it('lets the user sign out instead', async () => {
    render(<ChangePasswordPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    await waitFor(() => expect(signOut).toHaveBeenCalled())
  })
})
