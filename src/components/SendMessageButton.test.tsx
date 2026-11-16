import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import SendMessageButton from './SendMessageButton'

describe('SendMessageButton', () => {
  it('calls the handler', async () => {
    const onClick = vi.fn()
    render(<SendMessageButton onClick={onClick} />)
    await userEvent.click(screen.getByRole('button', { name: 'Enviar mensaje' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('stays visible but does nothing when unavailable, saying why', async () => {
    const onClick = vi.fn()
    render(<SendMessageButton onClick={onClick} unavailable title="Sin contacto" />)
    const button = screen.getByRole('button', { name: 'Enviar mensaje' })
    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(button).toHaveAttribute('title', 'Sin contacto')
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })
})
