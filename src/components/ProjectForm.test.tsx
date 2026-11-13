import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProjectForm from './ProjectForm'

const png = (name: string) => new File(['x'], name, { type: 'image/png' })

function setup(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  const onCancel = vi.fn()
  render(<ProjectForm onSubmit={onSubmit} onCancel={onCancel} />)
  return { onSubmit, onCancel }
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Guardar proyecto' }))
const photos = () => screen.getAllByRole('img').map((i) => i.getAttribute('alt'))

beforeEach(() => {
  let n = 0
  URL.createObjectURL = vi.fn(() => `blob:${n++}`)
  URL.revokeObjectURL = vi.fn()
})

describe('ProjectForm', () => {
  it('requires a name', async () => {
    const { onSubmit } = setup()
    await save()
    expect(screen.getByText('El nombre es obligatorio')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre *')).toHaveAttribute('aria-invalid', 'true')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('validates the mail format but leaves the phone free', async () => {
    const { onSubmit } = setup()
    await userEvent.type(screen.getByLabelText('Nombre *'), 'Casa')
    await userEvent.type(screen.getByLabelText('Teléfono'), 'abc 123')
    await userEvent.type(screen.getByLabelText('Mail'), 'no-es-correo')
    await save()
    expect(screen.getByText('Escribe un correo válido')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits trimmed values, empty fields as null and open by default', async () => {
    const { onSubmit } = setup()
    await userEvent.type(screen.getByLabelText('Nombre *'), '  Casa Norte ')
    await userEvent.type(screen.getByLabelText('País'), ' México ')
    await save()
    expect(onSubmit).toHaveBeenCalledWith({
      project: {
        name: 'Casa Norte',
        responsible: null,
        description: null,
        details: null,
        started_at: null,
        country: 'México',
        region: null,
        phone: null,
        mail: null,
        status: 'open',
      },
      images: [],
    })
  })

  it('sends the details text', async () => {
    const { onSubmit } = setup()
    await userEvent.type(screen.getByLabelText('Nombre *'), 'Casa')
    await userEvent.type(screen.getByLabelText('Detalles'), 'Uno.{Enter}{Enter}Dos.')
    await save()
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ project: expect.objectContaining({ details: 'Uno.\n\nDos.' }) }),
    )
  })

  it('sends the chosen status and date', async () => {
    const { onSubmit } = setup()
    await userEvent.type(screen.getByLabelText('Nombre *'), 'Casa')
    await userEvent.selectOptions(screen.getByLabelText('Estado'), 'paused')
    await userEvent.type(screen.getByLabelText('Fecha de inicio'), '2026-03-01')
    await save()
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ project: expect.objectContaining({ status: 'paused', started_at: '2026-03-01' }) }),
    )
  })

  it('adds, reorders and removes photos, and submits them in order', async () => {
    const { onSubmit } = setup()
    const a = png('a.png')
    const b = png('b.png')
    const c = png('c.png')
    await userEvent.type(screen.getByLabelText('Nombre *'), 'Casa')
    await userEvent.upload(document.querySelector('input[type=file]')!, [a, b, c])
    expect(photos()).toEqual(['Foto 1', 'Foto 2', 'Foto 3'])
    expect(screen.getByText('Portada')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Bajar foto 1' })) // b a c
    await userEvent.click(screen.getByRole('button', { name: 'Quitar foto 3' })) // b a
    expect(screen.getByRole('button', { name: 'Subir foto 1' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Bajar foto 2' })).toBeDisabled()
    expect(photos()).toEqual(['Foto 1', 'Foto 2'])
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1)

    await save()
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ images: [b, a] }))
  })

  it('rejects non-image files', async () => {
    setup()
    await userEvent.upload(
      document.querySelector('input[type=file]')!,
      new File(['x'], 'doc.pdf', { type: 'application/pdf' }),
      { applyAccept: false },
    )
    expect(screen.getByRole('alert')).toHaveTextContent('doc.pdf: El archivo debe ser una imagen')
    expect(screen.queryAllByRole('img')).toHaveLength(0)
  })

  it('shows the error and keeps the form when saving fails', async () => {
    setup(vi.fn().mockRejectedValue(new Error('boom')))
    await userEvent.type(screen.getByLabelText('Nombre *'), 'Casa')
    await save()
    expect(await screen.findByText('boom')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre *')).toHaveValue('Casa')
    expect(screen.getByRole('button', { name: 'Guardar proyecto' })).toBeEnabled()
  })

  it('cancels', async () => {
    const { onCancel } = setup()
    await userEvent.click(within(screen.getByRole('form')).getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalled()
  })
})
