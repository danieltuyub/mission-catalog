import { beforeEach, describe, expect, it, vi } from 'vitest'

const sb = vi.hoisted(() => ({ insert: vi.fn() }))
vi.mock('./supabaseClient', () => ({
  supabase: { from: (table: string) => ({ insert: (row: unknown) => sb.insert(table, row) }) },
}))

const { isValidContact, sendContactMessage } = await vi.importActual<typeof import('./contactMessages')>('./contactMessages')

beforeEach(() => sb.insert.mockReset().mockResolvedValue({ error: null }))

describe('isValidContact', () => {
  it.each(['ana@correo.com', ' ana@correo.com ', '+52 55 1234 5678', '(55) 1234-5678', '5512345678'])('accepts %s', (v) => {
    expect(isValidContact(v)).toBe(true)
  })
  it.each(['', 'ana', 'ana@', 'a@b', '12345', '1234567890123456789', 'hola 5512345678', 'x'.repeat(201)])('rejects %s', (v) => {
    expect(isValidContact(v)).toBe(false)
  })
})

describe('sendContactMessage', () => {
  it('sends the trimmed fields and the language in use', async () => {
    await sendContactMessage({ name: ' Ana ', contact: ' a@b.co ', body: ' Hola ' })
    expect(sb.insert).toHaveBeenCalledWith('contact_messages', { name: 'Ana', contact: 'a@b.co', body: 'Hola', language: 'es' })
  })

  it('says to wait when the database brakes the sender', async () => {
    sb.insert.mockResolvedValue({ error: { message: 'rate_limited' } })
    await expect(sendContactMessage({ name: 'A', contact: 'a@b.co', body: 'x' })).rejects.toThrow('Espera un rato')
  })

  it('uses a generic message for other errors', async () => {
    sb.insert.mockResolvedValue({ error: { message: 'boom' } })
    await expect(sendContactMessage({ name: 'A', contact: 'a@b.co', body: 'x' })).rejects.toThrow('No se pudo enviar el mensaje')
  })
})
