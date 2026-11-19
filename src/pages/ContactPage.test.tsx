import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const svc = vi.hoisted(() => ({ send: vi.fn() }))
vi.mock('../services/supabaseClient', () => ({
  supabase: { from: (table: string) => ({ insert: (row: unknown) => svc.send(table, row) }) },
}))

import { getAuthSnapshot } from '../services/authService'
import { ADMIN, SIGNED_OUT } from '../test/auth'
import ContactPage from './ContactPage'

beforeEach(() => svc.send.mockReset().mockResolvedValue({ error: null }))
afterEach(() => {
  vi.mocked(getAuthSnapshot).mockReturnValue(SIGNED_OUT)
  window.location.hash = ''
})

async function fill(contact = 'ana@correo.com') {
  await userEvent.type(screen.getByLabelText('Nombre'), 'Ana')
  await userEvent.type(screen.getByLabelText(/Correo o teléfono/), contact)
  await userEvent.type(screen.getByLabelText(/Mensaje/), 'Hola')
}

describe('ContactPage', () => {
  it('sends the message and confirms it', async () => {
    render(<ContactPage />)
    await fill()
    await userEvent.click(screen.getByRole('button', { name: 'Enviar mensaje' }))
    expect(svc.send).toHaveBeenCalledWith('contact_messages', { name: 'Ana', contact: 'ana@correo.com', body: 'Hola', language: 'es' })
    expect(await screen.findByText('Mensaje enviado')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Enviar otro mensaje' }))
    expect(screen.getByLabelText('Nombre')).toHaveValue('')
  })

  it('does not send a contact that is neither an email nor a phone', async () => {
    render(<ContactPage />)
    await fill('ana')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar mensaje' }))
    expect(svc.send).not.toHaveBeenCalled()
    expect(screen.getByText('Escribe un correo o un teléfono válido.')).toBeInTheDocument()
  })

  it('shows why it could not send and keeps what was written', async () => {
    svc.send.mockResolvedValue({ error: { message: 'rate_limited' } })
    render(<ContactPage />)
    await fill()
    await userEvent.click(screen.getByRole('button', { name: 'Enviar mensaje' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Espera un rato antes de enviar otro')
    expect(screen.getByLabelText('Nombre')).toHaveValue('Ana')
  })

  it('pretends to send, and sends nothing, when the hidden field is filled', async () => {
    render(<ContactPage />)
    await fill()
    await userEvent.type(document.querySelector('input[tabindex="-1"]')!, 'spam')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar mensaje' }))
    expect(await screen.findByText('Mensaje enviado')).toBeInTheDocument()
    expect(svc.send).not.toHaveBeenCalled()
  })

  it('sends an admin to their inbox instead', () => {
    vi.mocked(getAuthSnapshot).mockReturnValue(ADMIN)
    render(<ContactPage />)
    expect(window.location.hash).toBe('#/admin/contacto')
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
  })
})
