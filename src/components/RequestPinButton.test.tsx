import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import RequestPinButton from './RequestPinButton'

describe('RequestPinButton', () => {
  it('offers to request a pin and toggles', async () => {
    const onToggle = vi.fn()
    const { rerender } = render(<RequestPinButton active={false} onToggle={onToggle} />)
    const button = screen.getByRole('button', { name: 'Solicitar pin' })
    expect(button).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(button)
    expect(onToggle).toHaveBeenCalledOnce()

    rerender(<RequestPinButton active onToggle={onToggle} />)
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveAttribute('aria-pressed', 'true')
  })
})
