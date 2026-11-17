import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createUser } = vi.hoisted(() => ({ createUser: vi.fn() }))
vi.mock('../../services/adminUsers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/adminUsers')>()),
  createUser,
}))

import { getToast } from '../../services/toast'
import NewUserForm from './NewUserForm'

const setup = () => {
  const onCreated = vi.fn()
  const onClose = vi.fn()
  render(<NewUserForm onCreated={onCreated} onClose={onClose} />)
  return { onCreated, onClose }
}
const password = () => screen.getByLabelText('Contraseña temporal') as HTMLInputElement

// Braces: a function returned from `beforeEach` would be run as its teardown.
beforeEach(() => {
  createUser.mockReset().mockResolvedValue('u9')
})

describe('NewUserForm', () => {
  it('starts with a generated password the admin can see and edit', async () => {
    setup()
    expect(password().value).toHaveLength(14)
    await userEvent.clear(password())
    await userEvent.type(password(), 'Mi-clave-elegida-1')
    expect(password().value).toBe('Mi-clave-elegida-1')
  })

  it('regenerates the password', async () => {
    setup()
    const first = password().value
    await userEvent.click(screen.getByRole('button', { name: 'Regenerar' }))
    expect(password().value).not.toBe(first)
  })

  it('creates the user and shows what to hand over, once', async () => {
    const { onCreated } = setup()
    await userEvent.type(screen.getByLabelText('Correo'), ' ana@b.com ')
    await userEvent.type(screen.getByLabelText('Nombre'), 'Ana')
    await userEvent.type(screen.getByLabelText('Apellido'), 'Paz')
    await userEvent.selectOptions(screen.getByLabelText('Rol'), 'creator')
    const generated = password().value
    await userEvent.click(screen.getByRole('button', { name: 'Crear usuario' }))
    expect(createUser).toHaveBeenCalledWith({ email: 'ana@b.com', firstName: 'Ana', lastName: 'Paz', role: 'creator', password: generated })
    expect(await screen.findByRole('region', { name: 'Usuario creado' })).toHaveTextContent(generated)
    expect(screen.getByText('ana@b.com')).toBeInTheDocument()
    expect(onCreated).toHaveBeenCalled()
  })

  it('copies a value', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    setup()
    await userEvent.type(screen.getByLabelText('Correo'), 'ana@b.com')
    const generated = password().value
    await userEvent.click(screen.getByRole('button', { name: 'Crear usuario' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Copiar contraseña temporal' }))
    expect(writeText).toHaveBeenCalledWith(generated)
    expect(getToast()?.message).toBe('Copiado')
  })

  it('offers to create another, with a new password', async () => {
    setup()
    await userEvent.type(screen.getByLabelText('Correo'), 'ana@b.com')
    const first = password().value
    await userEvent.click(screen.getByRole('button', { name: 'Crear usuario' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Crear otro' }))
    expect(screen.getByLabelText('Correo')).toHaveValue('')
    expect(password().value).not.toBe(first)
  })

  it('refuses a short password without asking the server', async () => {
    setup()
    await userEvent.type(screen.getByLabelText('Correo'), 'ana@b.com')
    await userEvent.clear(password())
    await userEvent.type(password(), 'corta')
    await userEvent.click(screen.getByRole('button', { name: 'Crear usuario' }))
    expect(screen.getByRole('alert')).toHaveTextContent('al menos 8 caracteres')
    expect(createUser).not.toHaveBeenCalled()
  })

  it('shows the error and keeps what was typed', async () => {
    createUser.mockRejectedValue(new Error('Ya existe un usuario con ese correo'))
    setup()
    await userEvent.type(screen.getByLabelText('Correo'), 'ana@b.com')
    await userEvent.click(screen.getByRole('button', { name: 'Crear usuario' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe un usuario con ese correo')
    expect(screen.getByLabelText('Correo')).toHaveValue('ana@b.com')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Crear usuario' })).toBeEnabled())
  })

  it('closes without creating', async () => {
    const { onClose } = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onClose).toHaveBeenCalled()
    expect(createUser).not.toHaveBeenCalled()
  })
})
