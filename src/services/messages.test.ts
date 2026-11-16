import { beforeEach, describe, expect, it, vi } from 'vitest'

const sb = vi.hoisted(() => ({ insert: vi.fn() }))

vi.mock('./supabaseClient', () => ({
  supabase: {
    from: (table: string) => ({
      insert: (row: unknown) => ({ select: () => ({ single: () => sb.insert(table, row) }) }),
    }),
  },
}))

import { MAX_MESSAGE_LENGTH, sendProjectMessage } from './messages'

const saved = { id: 'm1', project_id: 'p1', body: 'Hola' }

beforeEach(() => sb.insert.mockReset().mockResolvedValue({ data: saved, error: null }))

describe('sendProjectMessage', () => {
  it('sends only the project and the trimmed text: the database decides the rest', async () => {
    await expect(sendProjectMessage('p1', '  Hola  ')).resolves.toEqual(saved)
    expect(sb.insert).toHaveBeenCalledWith('messages', { project_id: 'p1', body: 'Hola' })
  })

  it('says the project has no contact when there is no recipient', async () => {
    sb.insert.mockResolvedValue({ data: null, error: { code: '23502', message: 'null recipient' } })
    await expect(sendProjectMessage('p1', 'Hola')).rejects.toThrow('aún no tiene un contacto asignado')
  })

  it('explains a permission rejection', async () => {
    sb.insert.mockResolvedValue({ data: null, error: { code: '42501', message: 'rls' } })
    await expect(sendProjectMessage('p1', 'Hola')).rejects.toThrow('Tu cuenta no puede enviar mensajes')
  })

  it('does not leak other errors', async () => {
    sb.insert.mockResolvedValue({ data: null, error: { code: '500', message: 'internal details' } })
    await expect(sendProjectMessage('p1', 'Hola')).rejects.toThrow('No se pudo enviar el mensaje. Inténtalo de nuevo.')
  })

  it('knows the limit the database enforces', () => {
    expect(MAX_MESSAGE_LENGTH).toBe(2000)
  })
})
