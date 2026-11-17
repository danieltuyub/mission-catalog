import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.hoisted(() => vi.fn())
vi.mock('./supabaseClient', () => ({ supabase: { rpc } }))

import { listPinLocations } from './pinLocations'

beforeEach(() => rpc.mockReset())

describe('listPinLocations', () => {
  it('maps the exact places by pin id', async () => {
    rpc.mockResolvedValue({ data: [{ pin_id: 'a', lat: 1.5, lng: 2.5 }], error: null })
    const places = await listPinLocations()
    expect(rpc).toHaveBeenCalledWith('admin_pin_locations')
    expect(places.get('a')).toEqual([1.5, 2.5])
  })

  it('fails with a message ready to show', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'forbidden' } })
    await expect(listPinLocations()).rejects.toThrow('No se pudieron cargar las ubicaciones')
  })
})
