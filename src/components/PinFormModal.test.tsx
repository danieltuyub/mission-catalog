import { render, screen, within } from '@testing-library/react'
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
    const save = screen.getByRole('button', { name: 'Guardar' })
    expect(save).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Título'), 'Base')
    await userEvent.type(screen.getByLabelText('País'), 'México')
    expect(save).toBeEnabled()
  })

  it('submits trimmed values', async () => {
    const { onSubmit } = setup()
    await userEvent.type(screen.getByLabelText('Título'), ' Base ')
    await userEvent.type(screen.getByLabelText('País'), 'México')
    await userEvent.type(screen.getByLabelText('Descripción'), ' Main camp ')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(onSubmit).toHaveBeenCalledWith({ title: 'Base', description: 'Main camp', country: 'México', region: '', city: '', image: undefined })
  })

  it('passes the chosen image to onSubmit and shows a preview', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    const { onSubmit } = setup()
    const file = new File(['x'], 'a.png', { type: 'image/png' })
    await userEvent.type(screen.getByLabelText('Título'), 'Base')
    await userEvent.type(screen.getByLabelText('País'), 'México')
    await userEvent.upload(screen.getByLabelText('Imagen'), file)
    expect(screen.getByAltText('Vista previa')).toHaveAttribute('src', 'blob:x')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(onSubmit).toHaveBeenCalledWith({ title: 'Base', description: '', country: 'México', region: '', city: '', image: file })
  })

  it('rejects non-image files', async () => {
    const { onSubmit } = setup()
    const file = new File(['x'], 'a.txt', { type: 'text/plain' })
    await userEvent.type(screen.getByLabelText('Título'), 'Base')
    await userEvent.type(screen.getByLabelText('País'), 'México')
    await userEvent.upload(screen.getByLabelText('Imagen'), file, { applyAccept: false })
    expect(screen.getByText('El archivo debe ser una imagen')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(onSubmit).toHaveBeenCalledWith({ title: 'Base', description: '', country: 'México', region: '', city: '', image: undefined })
  })

  it('shows the error when saving fails', async () => {
    setup(vi.fn().mockRejectedValue(new Error('boom')))
    await userEvent.type(screen.getByLabelText('Título'), 'Base')
    await userEvent.type(screen.getByLabelText('País'), 'México')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('boom')).toBeInTheDocument()
  })

  it('cancels on Escape', async () => {
    const { onCancel } = setup()
    await userEvent.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalled()
  })

  describe('new pin', () => {
    it('is titled as a new pin and does not mention a review', () => {
      setup()
      expect(screen.getByRole('dialog', { name: 'Nuevo pin' })).toBeInTheDocument()
      expect(screen.queryByText(/administrador revisará/)).not.toBeInTheDocument()
    })
  })

  describe('request mode', () => {
    const open = (onSubmit = vi.fn().mockResolvedValue(undefined)) => {
      render(<PinFormModal lat={1} lng={2} request onSubmit={onSubmit} onCancel={vi.fn()} />)
      return onSubmit
    }

    it('says it is a request that an admin will review', () => {
      open()
      expect(screen.getByRole('dialog', { name: 'Solicitar pin' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Solicitar pin' })).toBeInTheDocument()
      expect(screen.getByText('Un administrador revisará tu solicitud antes de publicar el pin.')).toBeInTheDocument()
    })

    it('sends the request with the form values', async () => {
      const onSubmit = open()
      const send = screen.getByRole('button', { name: 'Enviar solicitud' })
      expect(send).toBeDisabled()
      await userEvent.type(screen.getByLabelText('Título'), 'Base')
      await userEvent.type(screen.getByLabelText('País'), 'México')
      await userEvent.click(send)
      expect(onSubmit).toHaveBeenCalledWith({ title: 'Base', description: '', country: 'México', region: '', city: '', image: undefined })
    })

    it('shows the failure message', async () => {
      open(vi.fn().mockRejectedValue(new Error('Ya tienes 5 solicitudes pendientes.')))
      await userEvent.type(screen.getByLabelText('Título'), 'Base')
      await userEvent.type(screen.getByLabelText('País'), 'México')
      await userEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }))
      expect(await screen.findByText('Ya tienes 5 solicitudes pendientes.')).toBeInTheDocument()
    })
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
      country: 'México',
      region: 'Yucatán',
      city: 'Mérida',
    }
    const open = (onSubmit = vi.fn().mockResolvedValue(undefined)) => {
      render(<PinFormModal lat={1} lng={2} pin={pin} onSubmit={onSubmit} onCancel={vi.fn()} />)
      return onSubmit
    }

    it('prefills values and shows the current image', () => {
      open()
      expect(screen.getByRole('dialog', { name: 'Editar pin' })).toBeInTheDocument()
      expect(screen.getByLabelText('Título')).toHaveValue('Base')
      expect(screen.getByLabelText('Descripción')).toHaveValue('Camp')
      expect(screen.getByAltText('Imagen actual')).toBeInTheDocument()
    })

    it('keeps the image untouched by default', async () => {
      const onSubmit = open()
      await userEvent.clear(screen.getByLabelText('Título'))
      await userEvent.type(screen.getByLabelText('Título'), 'Nuevo')
      await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
      expect(onSubmit).toHaveBeenCalledWith({
        title: 'Nuevo',
        description: 'Camp',
        country: 'México',
        region: 'Yucatán',
        city: 'Mérida',
        image: undefined,
        removeImage: undefined,
      })
    })

    it('flags image removal', async () => {
      const onSubmit = open()
      await userEvent.click(screen.getByRole('button', { name: 'Quitar imagen' }))
      expect(screen.queryByAltText('Imagen actual')).not.toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ removeImage: true }))
    })
  })
})

describe('PinFormModal place', () => {
  const known = [
    { country: 'México', region: 'Yucatán', city: 'Mérida' },
    { country: 'Guatemala', region: 'Sacatepéquez', city: 'Antigua' },
  ] as Pin[]

  it('needs a country to save', async () => {
    render(<PinFormModal lat={1} lng={2} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    await userEvent.type(screen.getByLabelText('Título'), 'Base')
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
    await userEvent.type(screen.getByLabelText('País'), 'Chile')
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled()
  })

  it('keeps the spelling already in use, whatever the accents or case', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<PinFormModal lat={1} lng={2} known={known} onSubmit={onSubmit} onCancel={vi.fn()} />)
    await userEvent.type(screen.getByLabelText('Título'), 'Base')
    await userEvent.type(screen.getByLabelText('País'), '  mexico ')
    await userEvent.type(screen.getByLabelText('Estado o región'), 'yucatan')
    await userEvent.type(screen.getByLabelText('Ciudad'), 'merida')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ country: 'México', region: 'Yucatán', city: 'Mérida' }))
  })

  it('suggests the regions of the chosen country', async () => {
    const { container } = render(<PinFormModal lat={1} lng={2} known={known} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    const options = () => [...container.querySelectorAll('datalist')].map((d) => [...d.querySelectorAll('option')].map((o) => o.getAttribute('value')))
    expect(options()[0]).toEqual(['Sacatepéquez', 'Yucatán'])
    await userEvent.type(screen.getByLabelText('País'), 'México')
    expect(options()[0]).toEqual(['Yucatán'])
  })

  it('searches the country list ignoring accents and picks one by click', async () => {
    render(<PinFormModal lat={1} lng={2} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    await userEvent.type(screen.getByLabelText('País'), 'mexi')
    const list = screen.getByRole('listbox', { name: 'Países' })
    expect(within(list).getAllByRole('option').map((o) => o.textContent)).toEqual(['México'])
    await userEvent.click(within(list).getByRole('option', { name: 'México' }))
    expect(screen.getByLabelText('País')).toHaveValue('México')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('picks with the keyboard, and Escape closes the list without closing the dialog', async () => {
    const onCancel = vi.fn()
    render(<PinFormModal lat={1} lng={2} onSubmit={vi.fn()} onCancel={onCancel} />)
    await userEvent.type(screen.getByLabelText('País'), 'guat')
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onCancel).not.toHaveBeenCalled()
    await userEvent.keyboard('{ArrowDown}{Enter}')
    expect(screen.getByLabelText('País')).toHaveValue('Guatemala')
  })

  it('only accepts a country from the list', async () => {
    render(<PinFormModal lat={1} lng={2} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    await userEvent.type(screen.getByLabelText('Título'), 'Base')
    await userEvent.type(screen.getByLabelText('País'), 'Narnia')
    expect(screen.getByText('Elige un país de la lista')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
  })

  it('keeps a country written before the list existed while editing that pin', () => {
    const old = { id: '1', title: 'Base', description: '', lat: 1, lng: 2, created_at: 'x', image_path: null, country: 'USA', region: '', city: '' }
    render(<PinFormModal lat={1} lng={2} pin={old} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.queryByText('Elige un país de la lista')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled()
  })
})
