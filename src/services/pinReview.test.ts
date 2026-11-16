import { beforeEach, describe, expect, it, vi } from 'vitest'

const sb = vi.hoisted(() => ({
  /** Result of each status update, in order. */
  updates: [] as { data: unknown; error: unknown }[],
  statuses: [] as string[],
  download: vi.fn(),
  upload: vi.fn(),
  createPin: vi.fn(),
  removePinImage: vi.fn(),
}))

vi.mock('./supabaseClient', () => ({
  supabase: {
    from: () => {
      let current: { data: unknown; error: unknown } = { data: null, error: null }
      const builder: Record<string, unknown> = {
        then: (resolve: (v: unknown) => unknown) => Promise.resolve(current).then(resolve),
        update: (patch: { status: string }) => {
          sb.statuses.push(patch.status)
          current = sb.updates.shift() ?? { data: [{ id: 'r1' }], error: null }
          return builder
        },
      }
      for (const m of ['eq', 'select']) builder[m] = () => builder
      return builder
    },
    storage: {
      from: (bucket: string) => ({
        download: (path: string) => sb.download(bucket, path),
        upload: (path: string, blob: Blob, opts: unknown) => sb.upload(bucket, path, blob, opts),
      }),
    },
  },
}))
vi.mock('./pinService', () => ({ createPin: sb.createPin, removePinImage: sb.removePinImage }))

import { approveRequest, rejectRequest } from './pinRequests'
import type { PinRequest } from '../types'

const request: PinRequest = {
  id: 'r1',
  requested_by: 'u1',
  title: 'Pozo',
  description: 'Cerca',
  lat: 1,
  lng: 2,
  image_path: null,
  status: 'pending',
  created_at: 'x',
}

beforeEach(() => {
  sb.updates = []
  sb.statuses = []
  sb.download.mockReset().mockResolvedValue({ data: new Blob(['x'], { type: 'image/webp' }), error: null })
  sb.upload.mockReset().mockResolvedValue({ error: null })
  sb.createPin.mockReset().mockResolvedValue({})
  sb.removePinImage.mockReset().mockResolvedValue(undefined)
})

describe('approveRequest', () => {
  it('claims the request, then publishes the pin without a photo', async () => {
    await approveRequest(request)
    expect(sb.statuses).toEqual(['approved'])
    expect(sb.createPin).toHaveBeenCalledWith({ title: 'Pozo', description: 'Cerca', lat: 1, lng: 2, image_path: undefined })
    expect(sb.download).not.toHaveBeenCalled()
  })

  it('copies the photo from the private bucket to the public one', async () => {
    await approveRequest({ ...request, image_path: 'u1/a.webp' })
    expect(sb.download).toHaveBeenCalledWith('pin-request-images', 'u1/a.webp')
    expect(sb.upload).toHaveBeenCalledWith('pin-images', expect.stringMatching(/\.webp$/), expect.any(Blob), expect.anything())
    expect(sb.createPin).toHaveBeenCalledWith(expect.objectContaining({ image_path: expect.stringMatching(/\.webp$/) }))
  })

  it('does nothing when someone else already reviewed it', async () => {
    sb.updates = [{ data: [], error: null }]
    await expect(approveRequest(request)).rejects.toThrow('ya fue revisada')
    expect(sb.createPin).not.toHaveBeenCalled()
  })

  it('puts the request back to pending and cleans the copy when the pin cannot be created', async () => {
    sb.createPin.mockRejectedValue(new Error('boom'))
    await expect(approveRequest({ ...request, image_path: 'u1/a.webp' })).rejects.toThrow('sigue pendiente')
    expect(sb.statuses).toEqual(['approved', 'pending'])
    expect(sb.removePinImage).toHaveBeenCalledOnce()
  })
})

describe('rejectRequest', () => {
  it('moves it to rejected', async () => {
    await rejectRequest('r1')
    expect(sb.statuses).toEqual(['rejected'])
  })

  it('refuses a request that is no longer pending', async () => {
    sb.updates = [{ data: [], error: null }]
    await expect(rejectRequest('r1')).rejects.toThrow('ya fue revisada')
  })
})
