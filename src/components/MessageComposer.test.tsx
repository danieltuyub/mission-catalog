import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import MessageComposer from './MessageComposer'

function setup(onSend = vi.fn().mockResolvedValue(undefined)) {
  const onCancel = vi.fn()
  render(<MessageComposer projectName="Iglesia Norte" onSend={onSend} onCancel={onCancel} />)
  return { onSend, onCancel }
}

describe('MessageComposer', () => {
  it('names the project and starts focused on the text', () => {
    setup()
    expect(screen.getByRole('dialog', { name: 'Enviar mensaje' })).toBeInTheDocument()
    expect(screen.getByText('Sobre Iglesia Norte')).toBeInTheDocument()
    expect(screen.getByLabelText('Mensaje')).toHaveFocus()
  })

  it('cannot send an empty or blank message', async () => {
    setup()
    const send = screen.getByRole('button', { name: 'Enviar' })
    expect(send).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Mensaje'), '   ')
    expect(send).toBeDisabled()
  })

  it('sends the trimmed text and counts characters', async () => {
    const { onSend } = setup()
    await userEvent.type(screen.getByLabelText('Mensaje'), ' Hola ')
    expect(screen.getByText('6/2000')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(onSend).toHaveBeenCalledWith('Hola')
  })

  it('shows why sending failed and lets the user retry', async () => {
    const { onSend } = setup(vi.fn().mockRejectedValueOnce(new Error('Sin conexión')).mockResolvedValue(undefined))
    await userEvent.type(screen.getByLabelText('Mensaje'), 'Hola')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(onSend).toHaveBeenCalledTimes(2)
  })

  it('cancels with the button, Escape and a click outside', async () => {
    const { onCancel } = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    await userEvent.keyboard('{Escape}')
    await userEvent.click(screen.getByRole('dialog').parentElement as HTMLElement)
    expect(onCancel).toHaveBeenCalledTimes(3)
  })

  it('does not close while sending', async () => {
    let finish!: () => void
    const { onCancel } = setup(vi.fn(() => new Promise<void>((r) => (finish = r))))
    await userEvent.type(screen.getByLabelText('Mensaje'), 'Hola')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(screen.getByRole('button', { name: 'Enviando…' })).toBeDisabled()
    await userEvent.keyboard('{Escape}')
    expect(onCancel).not.toHaveBeenCalled()
    finish()
  })
})
