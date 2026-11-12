import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Pin } from '../types'
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
    expect(onSubmit).toHaveBeenCalledWith({ title: 'Base', description: 'Main camp', image: undefined })
  })

  it('passes the chosen image to onSubmit and shows a preview', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    const { onSubmit } = setup()
    const file = new File(['x'], 'a.png', { type: 'image/png' })
    await userEvent.type(screen.getByLabelText('Title'), 'Base')
    await userEvent.upload(screen.getByLabelText('Image'), file)
    expect(screen.getByAltText('Preview')).toHaveAttribute('src', 'blob:x')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).toHaveBeenCalledWith({ title: 'Base', description: '', image: file })
  })

  it('rejects non-image files', async () => {
    const { onSubmit } = setup()
    const file = new File(['x'], 'a.txt', { type: 'text/plain' })
    await userEvent.type(screen.getByLabelText('Title'), 'Base')
    await userEvent.upload(screen.getByLabelText('Image'), file, { applyAccept: false })
    expect(screen.getByText('El archivo debe ser una imagen')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).toHaveBeenCalledWith({ title: 'Base', description: '', image: undefined })
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

  describe('edit mode', () => {
    const pin: Pin = {
      id: '1',
      title: 'Base',
      description: 'Camp',
      lat: 1,
      lng: 2,
      created_at: '2026-01-01T00:00:00Z',
      image_path: 'a.webp',
    }
    const open = (onSubmit = vi.fn().mockResolvedValue(undefined)) => {
      render(<PinFormModal lat={1} lng={2} pin={pin} onSubmit={onSubmit} onCancel={vi.fn()} />)
      return onSubmit
    }

    it('prefills values and shows the current image', () => {
      open()
      expect(screen.getByRole('dialog', { name: 'Edit pin' })).toBeInTheDocument()
      expect(screen.getByLabelText('Title')).toHaveValue('Base')
      expect(screen.getByLabelText('Description')).toHaveValue('Camp')
      expect(screen.getByAltText('Current image')).toBeInTheDocument()
    })

    it('keeps the image untouched by default', async () => {
      const onSubmit = open()
      await userEvent.clear(screen.getByLabelText('Title'))
      await userEvent.type(screen.getByLabelText('Title'), 'Nuevo')
      await userEvent.click(screen.getByRole('button', { name: 'Save' }))
      expect(onSubmit).toHaveBeenCalledWith({
        title: 'Nuevo',
        description: 'Camp',
        image: undefined,
        removeImage: undefined,
      })
    })

    it('flags image removal', async () => {
      const onSubmit = open()
      await userEvent.click(screen.getByRole('button', { name: 'Remove image' }))
      expect(screen.queryByAltText('Current image')).not.toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Save' }))
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ removeImage: true }))
    })
  })
})
