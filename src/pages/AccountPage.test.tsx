import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const svc = vi.hoisted(() => ({
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
}))
vi.mock('../services/accountService', () => ({ ...svc, MIN_PASSWORD_LENGTH: 8 }))

import { getAuthSnapshot, setProfileNames } from '../services/authService'
import { SIGNED_OUT, SUBSCRIBER } from '../test/auth'
import AccountPage from './AccountPage'

beforeEach(() => {
  Object.values(svc).forEach((f) => f.mockReset())
  svc.getProfile.mockResolvedValue({ first_name: 'Ana', last_name: 'Pérez' })
  svc.updateProfile.mockResolvedValue(undefined)
  svc.changePassword.mockResolvedValue(undefined)
  vi.mocked(setProfileNames).mockClear()
  vi.mocked(getAuthSnapshot).mockReturnValue(SUBSCRIBER)
})
afterEach(() => {
  vi.mocked(getAuthSnapshot).mockReturnValue(SIGNED_OUT)
  window.location.hash = ''
})

const open = async () => {
  render(<AccountPage />)
  await screen.findByLabelText('Nombre')
}

describe('AccountPage', () => {
  it('sends signed-out visitors to the login', () => {
    vi.mocked(getAuthSnapshot).mockReturnValue(SIGNED_OUT)
    window.location.hash = '#/cuenta'
    render(<AccountPage />)
    expect(screen.queryByRole('heading', { name: 'Mi cuenta' })).not.toBeInTheDocument()
    expect(window.location.hash).toBe('#/login?next=%2Fcuenta')
  })

  it('keeps both sections in a single panel', async () => {
    await open()
    const profile = screen.getByRole('region', { name: 'Datos personales' })
    const password = screen.getByRole('region', { name: 'Contraseña' })
    expect(profile.parentElement).toBe(password.parentElement)
    expect(profile.parentElement).toHaveClass('rounded-2xl')
  })

  it('shows the email and the saved names', async () => {
    await open()
    expect(svc.getProfile).toHaveBeenCalledWith('sub-1')
    expect(screen.getByText('s@b.com')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre')).toHaveValue('Ana')
    expect(screen.getByLabelText('Apellido')).toHaveValue('Pérez')
  })

  it('saves trimmed names and confirms', async () => {
    await open()
    await userEvent.clear(screen.getByLabelText('Nombre'))
    await userEvent.type(screen.getByLabelText('Nombre'), '  Lucía ')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(svc.updateProfile).toHaveBeenCalledWith('sub-1', { first_name: 'Lucía', last_name: 'Pérez' })
    expect(await screen.findByRole('status')).toHaveTextContent('Cambios guardados')
    // The navbar menu shows the new name without a reload.
    expect(setProfileNames).toHaveBeenCalledWith('Lucía', 'Pérez')
  })

  it('requires a first name', async () => {
    await open()
    await userEvent.clear(screen.getByLabelText('Nombre'))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(screen.getByRole('alert')).toHaveTextContent('El nombre es obligatorio')
    expect(svc.updateProfile).not.toHaveBeenCalled()
  })

  it('shows the error when saving fails and keeps the form usable', async () => {
    svc.updateProfile.mockRejectedValue(new Error('No se encontró tu perfil'))
    await open()
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se encontró tu perfil')
    expect(setProfileNames).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled()
  })

  it('shows a message when the profile cannot be loaded', async () => {
    svc.getProfile.mockRejectedValue(new Error('boom'))
    render(<AccountPage />)
    expect(await screen.findByText(/No se pudo cargar tu perfil: boom/)).toBeInTheDocument()
  })

  describe('password', () => {
    const form = () => screen.getByRole('form', { name: 'Cambiar contraseña' })
    const type = async (next: string, confirm: string) => {
      await userEvent.type(screen.getByLabelText('Nueva contraseña'), next)
      await userEvent.type(screen.getByLabelText('Confirmar contraseña'), confirm)
      await userEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))
    }

    it('rejects short passwords', async () => {
      await open()
      await type('corta', 'corta')
      expect(form()).toHaveTextContent('al menos 8 caracteres')
      expect(svc.changePassword).not.toHaveBeenCalled()
    })

    it('rejects a mismatched confirmation', async () => {
      await open()
      await type('clave-larga-1', 'clave-larga-2')
      expect(form()).toHaveTextContent('Las contraseñas no coinciden')
      expect(svc.changePassword).not.toHaveBeenCalled()
    })

    it('changes the password, confirms and clears the fields', async () => {
      await open()
      await type('clave-larga-1', 'clave-larga-1')
      expect(svc.changePassword).toHaveBeenCalledWith('clave-larga-1')
      expect(await screen.findByText('Contraseña actualizada')).toBeInTheDocument()
      expect(screen.getByLabelText('Nueva contraseña')).toHaveValue('')
      expect(screen.getByLabelText('Confirmar contraseña')).toHaveValue('')
    })

    it('shows the server error and keeps what was typed', async () => {
      svc.changePassword.mockRejectedValue(new Error('La nueva contraseña debe ser distinta de la actual'))
      await open()
      await type('clave-larga-1', 'clave-larga-1')
      expect(await screen.findByText(/distinta de la actual/)).toBeInTheDocument()
      expect(screen.getByLabelText('Nueva contraseña')).toHaveValue('clave-larga-1')
    })
  })
})
