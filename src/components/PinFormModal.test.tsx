import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import PinFormModal from './PinFormModal'

function setup(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  const onCancel = vi.fn()
  render(<PinFormModal lat={1} lng={2} onSubmit={onSubmit} onCancel={onCancel} />)
  return { onSubmit, onCancel }
}

describe('PinFormModal', () => {
  it('disables save until a title is entered', async () => {
    setup()
    const save = screen.getByRole('button', { name: 'Save' })
    expect(save).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Title'), 'Base')
    expect(save).toBeEnabled()
  })

  it('submits trimmed values', async () => {
    const { onSubmit } = setup()
    await userEvent.type(screen.getByLabelText('Title'), ' Base ')
    await userEvent.type(screen.getByLabelText('Description'), ' Main camp ')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).toHaveBeenCalledWith({ title: 'Base', description: 'Main camp' })
  })

  it('shows the error when saving fails', async () => {
    setup(vi.fn().mockRejectedValue(new Error('boom')))
    await userEvent.type(screen.getByLabelText('Title'), 'Base')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('boom')).toBeInTheDocument()
  })

  it('cancels on Escape', async () => {
    const { onCancel } = setup()
    await userEvent.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalled()
  })
})
