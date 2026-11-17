import { beforeEach, describe, expect, it, vi } from 'vitest'

const sb = vi.hoisted(() => ({
  count: vi.fn(),
  insert: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  compress: vi.fn(),
}))

vi.mock('./imageUtils', () => ({ compressImage: sb.compress }))
vi.mock('./supabaseClient', () => ({
  supabase: {
    from: (table: string) => ({
      select: (cols: string, opts: unknown) => ({
        eq: (c1: string, v1: string) => ({ eq: (c2: string, v2: string) => sb.count(table, cols, opts, [c1, v1], [c2, v2]) }),
      }),
      insert: (row: unknown) => ({ select: () => ({ single: () => sb.insert(table, row) }) }),
    }),
    storage: { from: (bucket: string) => ({ upload: (...a: unknown[]) => sb.upload(bucket, ...a), remove: (p: string[]) => sb.remove(bucket, p) }) },
  },
}))

import { MAX_PENDING_REQUESTS, requestPin } from './pinRequests'

const input = { title: 'Base', description: 'Camp', lat: 1, lng: 2, country: 'México', region: 'Yucatán', city: 'Mérida' }
const saved = { id: 'r1', ...input, status: 'pending', requested_by: 'u1', image_path: null }

beforeEach(() => {
  Object.values(sb).forEach((fn) => fn.mockReset())
  sb.count.mockResolvedValue({ count: 0, error: null })
  sb.insert.mockResolvedValue({ data: saved, error: null })
  sb.upload.mockResolvedValue({ error: null })
  sb.remove.mockResolvedValue({ error: null })
  sb.compress.mockResolvedValue(new Blob(['x']))
})

describe('requestPin', () => {
  it('files the request without image and returns it', async () => {
    await expect(requestPin('u1', input)).resolves.toEqual(saved)
    expect(sb.insert).toHaveBeenCalledWith('pin_requests', expect.objectContaining(input))
    expect(sb.insert.mock.calls[0][1]).not.toHaveProperty('image_path', expect.any(String))
    expect(sb.upload).not.toHaveBeenCalled()
  })

  it('only counts the user\'s own pending requests', async () => {
    await requestPin('u1', input)
    expect(sb.count).toHaveBeenCalledWith('pin_requests', 'id', { count: 'exact', head: true }, ['requested_by', 'u1'], ['status', 'pending'])
  })

  it('refuses at the limit, before uploading anything', async () => {
    sb.count.mockResolvedValue({ count: MAX_PENDING_REQUESTS, error: null })
    await expect(requestPin('u1', input, new File(['x'], 'a.png'))).rejects.toThrow('Ya tienes 5 solicitudes pendientes')
    expect(sb.upload).not.toHaveBeenCalled()
    expect(sb.insert).not.toHaveBeenCalled()
  })

  it('uploads the image to the private bucket under the user\'s folder', async () => {
    await requestPin('u1', input, new File(['x'], 'a.png', { type: 'image/png' }))
    const [bucket, path, , options] = sb.upload.mock.calls[0]
    expect(bucket).toBe('pin-request-images')
    expect(path).toMatch(/^u1\/[0-9a-f-]+\.webp$/)
    expect(options).toMatchObject({ contentType: 'image/webp' })
    expect(sb.insert).toHaveBeenCalledWith('pin_requests', expect.objectContaining({ image_path: path }))
  })

  it('removes the uploaded image when the request cannot be saved', async () => {
    sb.insert.mockResolvedValue({ data: null, error: { code: '500', message: 'boom' } })
    await expect(requestPin('u1', input, new File(['x'], 'a.png'))).rejects.toThrow('No se pudo enviar la solicitud')
    expect(sb.remove).toHaveBeenCalledWith('pin-request-images', [sb.upload.mock.calls[0][1]])
  })

  it('explains a permission or limit rejection from the database', async () => {
    sb.insert.mockResolvedValue({ data: null, error: { code: '42501', message: 'rls' } })
    await expect(requestPin('u1', input)).rejects.toThrow('ya alcanzaste el límite')
  })

  it('fails with a friendly message when the image cannot be uploaded', async () => {
    sb.upload.mockResolvedValue({ error: new Error('boom') })
    await expect(requestPin('u1', input, new File(['x'], 'a.png'))).rejects.toThrow('No se pudo subir la imagen')
    expect(sb.insert).not.toHaveBeenCalled()
  })

  it('fails with a friendly message when the count cannot be read', async () => {
    sb.count.mockResolvedValue({ count: null, error: { message: 'boom' } })
    await expect(requestPin('u1', input)).rejects.toThrow('No se pudo enviar la solicitud')
  })
})
