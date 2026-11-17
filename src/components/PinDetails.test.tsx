import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getAuthSnapshot } from '../services/authService'
import { getToast } from '../services/toast'
import { SIGNED_OUT, SUBSCRIBER } from '../test/auth'
import type { Pin } from '../types'
import PinDetails from './PinDetails'

const { getPinContactState, sendPinMessage } = vi.hoisted(() => ({
  getPinContactState: vi.fn(),
  sendPinMessage: vi.fn(),
}))
vi.mock('../services/pinContacts', () => ({ getPinContactState }))
vi.mock('../services/messages', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/messages')>()),
  sendPinMessage,
}))

const pin: Pin = {
  id: 'pin 1',
  title: 'Base',
  description: '',
  lat: 1,
  lng: 2,
  created_at: '2026-01-01T00:00:00Z',
  image_path: null,
  country: 'México',
  region: '',
  city: '',
  languages: ['es'],
  kind: 'family',
}

const button = () => screen.queryByRole('button', { name: /Enviar mensaje/ })

beforeEach(() => {
  getPinContactState.mockReset().mockResolvedValue('other')
  sendPinMessage.mockReset().mockResolvedValue({})
  vi.mocked(getAuthSnapshot).mockReturnValue(SUBSCRIBER)
  window.location.hash = '#/mapa'
})

afterEach(() => {
  vi.mocked(getAuthSnapshot).mockReturnValue(SIGNED_OUT)
})

describe('PinDetails message button', () => {
  it('sends a message to the pin’s contact', async () => {
    render(<PinDetails pin={pin} />)
    await waitFor(() => expect(button()).toBeEnabled())
    await userEvent.click(button()!)
    await userEvent.type(screen.getByRole('textbox', { name: 'Mensaje' }), 'Hola')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(sendPinMessage).toHaveBeenCalledWith('pin 1', 'Hola')
    await waitFor(() => expect(getToast()?.message).toBe('Mensaje enviado'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens the dialog in body, outside the card that holds the button', async () => {
    const { container } = render(<PinDetails pin={pin} />)
    await waitFor(() => expect(button()).toBeEnabled())
    await userEvent.click(button()!)
    const dialog = screen.getByRole('dialog')
    expect(container).not.toContainElement(dialog)
    expect(document.body).toContainElement(dialog)
  })

  it('is disabled until the pin has a contact', async () => {
    getPinContactState.mockResolvedValue('none')
    render(<PinDetails pin={pin} />)
    await waitFor(() => expect(screen.getByText(/Sin contacto/)).toBeInTheDocument())
    expect(button()).toBeDisabled()
  })

  it('is hidden for the contact themself', async () => {
    getPinContactState.mockResolvedValue('self')
    render(<PinDetails pin={pin} />)
    await waitFor(() => expect(getPinContactState).toHaveBeenCalled())
    await waitFor(() => expect(button()).not.toBeInTheDocument())
  })

  it('sends a signed-out visitor to sign in and back to this pin', async () => {
    vi.mocked(getAuthSnapshot).mockReturnValue(SIGNED_OUT)
    render(<PinDetails pin={pin} />)
    await waitFor(() => expect(button()).toBeEnabled())
    await userEvent.click(button()!)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    getToast()?.action?.onClick()
    expect(window.location.hash).toBe(`#/login?next=${encodeURIComponent('/mapa?pin=pin%201')}`)
  })

  it('refuses accounts without permission to send', async () => {
    vi.mocked(getAuthSnapshot).mockReturnValue({ ...SUBSCRIBER, permissions: [] })
    render(<PinDetails pin={pin} />)
    await waitFor(() => expect(button()).toBeEnabled())
    await userEvent.click(button()!)
    expect(getToast()?.message).toBe('Tu cuenta no puede enviar mensajes')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
