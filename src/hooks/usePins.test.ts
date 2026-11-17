import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Pin } from '../types'
import { usePins } from './usePins'

const svc = vi.hoisted(() => ({
  getPins: vi.fn(),
  createPin: vi.fn(),
  updatePin: vi.fn(),
  uploadPinImage: vi.fn(),
  removePinImage: vi.fn(),
}))
vi.mock('../services/pinService', () => svc)

const pin: Pin = {
  id: '1',
  title: 'Base',
  description: '',
  lat: 1,
  lng: 2,
  created_at: '2026-01-01T00:00:00Z',
  image_path: 'old.webp',
  country: 'México',
  region: 'Yucatán',
  city: 'Mérida',
  languages: ['es'],
  kind: 'family',
}
const patch = { title: 'Nuevo', description: '', country: 'México', region: 'Yucatán', city: 'Mérida', languages: ['es'], kind: 'family' as const }
const file = new File(['x'], 'a.png', { type: 'image/png' })

async function setup() {
  const hook = renderHook(() => usePins())
  await waitFor(() => expect(hook.result.current.pins).toHaveLength(1))
  return hook
}

describe('usePins.editPin', () => {
  beforeEach(() => {
    Object.values(svc).forEach((m) => m.mockReset())
    svc.getPins.mockResolvedValue([pin])
    svc.removePinImage.mockResolvedValue(undefined)
  })

  it('replaces the image and deletes the old file after the update', async () => {
    svc.uploadPinImage.mockResolvedValue('new.webp')
    svc.updatePin.mockResolvedValue({ ...pin, ...patch, image_path: 'new.webp' })
    const { result } = await setup()
    await act(() => result.current.editPin(pin, patch, file))
    expect(svc.updatePin).toHaveBeenCalledWith('1', { ...patch, image_path: 'new.webp' })
    expect(svc.removePinImage).toHaveBeenCalledWith('old.webp')
    expect(result.current.pins[0].title).toBe('Nuevo')
  })

  it('removes the image when asked', async () => {
    svc.updatePin.mockResolvedValue({ ...pin, ...patch, image_path: null })
    const { result } = await setup()
    await act(() => result.current.editPin(pin, patch, undefined, true))
    expect(svc.updatePin).toHaveBeenCalledWith('1', { ...patch, image_path: null })
    expect(svc.removePinImage).toHaveBeenCalledWith('old.webp')
  })

  it('leaves the image alone when nothing changes it', async () => {
    svc.updatePin.mockResolvedValue({ ...pin, ...patch })
    const { result } = await setup()
    await act(() => result.current.editPin(pin, patch))
    expect(svc.updatePin).toHaveBeenCalledWith('1', patch)
    expect(svc.removePinImage).not.toHaveBeenCalled()
  })

  it('deletes the new upload, not the old file, when the update fails', async () => {
    svc.uploadPinImage.mockResolvedValue('new.webp')
    svc.updatePin.mockRejectedValue(new Error('boom'))
    const { result } = await setup()
    await expect(act(() => result.current.editPin(pin, patch, file))).rejects.toThrow('boom')
    expect(svc.removePinImage).toHaveBeenCalledTimes(1)
    expect(svc.removePinImage).toHaveBeenCalledWith('new.webp')
  })
})
