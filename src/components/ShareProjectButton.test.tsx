import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const share = vi.hoisted(() => vi.fn())
vi.mock('../services/shareProject', () => ({ shareProject: share }))

import { getToast } from '../services/toast'
import ShareProjectButton from './ShareProjectButton'

const click = () => userEvent.click(screen.getByRole('button', { name: 'Compartir proyecto' }))

beforeEach(() => share.mockReset())

describe('ShareProjectButton', () => {
  it('shares the project by id and name', async () => {
    share.mockResolvedValue('shared')
    render(<ShareProjectButton id="abc" name="Casa Azul" />)
    await click()
    expect(share).toHaveBeenCalledWith('abc', 'Casa Azul')
    expect(getToast()).toBeNull()
  })

  it('confirms when the link was copied', async () => {
    share.mockResolvedValue('copied')
    render(<ShareProjectButton id="abc" name="Casa Azul" />)
    await click()
    expect(getToast()?.message).toBe('Enlace copiado')
  })

  it('stays quiet when the sheet is closed', async () => {
    share.mockResolvedValue('cancelled')
    render(<ShareProjectButton id="abc" name="Casa Azul" />)
    await click()
    expect(getToast()).toBeNull()
  })

  it('says so when it cannot share', async () => {
    share.mockResolvedValue('failed')
    render(<ShareProjectButton id="abc" name="Casa Azul" />)
    await click()
    expect(getToast()?.message).toBe('No se pudo compartir el proyecto')
  })
})
