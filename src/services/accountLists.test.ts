import { beforeEach, describe, expect, it, vi } from 'vitest'

const sb = vi.hoisted(() => ({
  result: { data: null, error: null } as { data: unknown; error: unknown },
  calls: [] as { method: string; args: unknown[] }[],
  signed: vi.fn(),
}))

vi.mock('./supabaseClient', () => ({
  supabase: {
    from: () => {
      const builder: Record<string, unknown> = {
        then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => Promise.resolve(sb.result).then(resolve, reject),
      }
      for (const method of ['select', 'eq', 'in', 'order']) {
        builder[method] = (...args: unknown[]) => {
          sb.calls.push({ method, args })
          return builder
        }
      }
      return builder
    },
    storage: { from: (bucket: string) => ({ createSignedUrl: (...a: unknown[]) => sb.signed(bucket, ...a) }) },
  },
}))

import { listMyRequests, requestImageUrl } from './pinRequests'
import { getCreatedProjects, getProjectsByIds } from './projectService'

const called = (method: string) => sb.calls.filter((c) => c.method === method).map((c) => c.args)

beforeEach(() => {
  sb.calls.length = 0
  sb.result = { data: [], error: null }
  sb.signed.mockReset().mockResolvedValue({ data: { signedUrl: 'https://signed' }, error: null })
})

describe('listMyRequests', () => {
  it('asks for the user’s own, newest first (admins can read everyone’s)', async () => {
    sb.result = { data: [{ id: 'r1' }], error: null }
    await expect(listMyRequests('u1')).resolves.toEqual([{ id: 'r1' }])
    expect(called('eq')).toEqual([['requested_by', 'u1']])
    expect(called('order')).toEqual([['created_at', { ascending: false }]])
  })

  it('fails with a message ready to show', async () => {
    sb.result = { data: null, error: { message: 'internal' } }
    await expect(listMyRequests('u1')).rejects.toThrow('No se pudieron cargar tus solicitudes')
  })
})

describe('requestImageUrl', () => {
  it('signs the private path for an hour', async () => {
    await expect(requestImageUrl('u1/a.webp')).resolves.toBe('https://signed')
    expect(sb.signed).toHaveBeenCalledWith('pin-request-images', 'u1/a.webp', 3600)
  })

  it('throws when it cannot be signed', async () => {
    sb.signed.mockResolvedValue({ data: null, error: { message: 'nope' } })
    await expect(requestImageUrl('u1/a.webp')).rejects.toThrow('No se pudo cargar la imagen')
  })
})

describe('project lists', () => {
  it('getCreatedProjects filters by creator and sorts by name', async () => {
    sb.result = { data: [{ id: 'p1' }], error: null }
    await expect(getCreatedProjects('u1')).resolves.toEqual([{ id: 'p1' }])
    expect(called('eq')).toEqual([['created_by', 'u1']])
    expect(called('order')[0]).toEqual(['name'])
  })

  it('getProjectsByIds asks for those ids, and for nothing when there are none', async () => {
    await getProjectsByIds(['a', 'b'])
    expect(called('in')).toEqual([['id', ['a', 'b']]])
    sb.calls.length = 0
    await expect(getProjectsByIds([])).resolves.toEqual([])
    expect(sb.calls).toHaveLength(0)
  })

  it('throws the database error', async () => {
    sb.result = { data: null, error: new Error('boom') }
    await expect(getCreatedProjects('u1')).rejects.toThrow('boom')
  })
})
