import { beforeEach, describe, expect, it, vi } from 'vitest'

const sb = vi.hoisted(() => ({
  results: {} as Record<string, { data: unknown; error: unknown }>,
  calls: [] as { table: string; method: string; args: unknown[] }[],
}))

// A query builder that records what was asked and resolves with the table's canned result.
vi.mock('./supabaseClient', () => ({
  supabase: {
    from: (table: string) => {
      const builder: Record<string, unknown> = {
        then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
          Promise.resolve(sb.results[table]).then(resolve, reject),
      }
      for (const method of ['select', 'eq', 'is', 'or', 'order', 'limit', 'insert', 'update', 'single']) {
        builder[method] = (...args: unknown[]) => {
          sb.calls.push({ table, method, args })
          return builder
        }
      }
      return builder
    },
  },
}))

import { listConversations, listThread, markConversationRead, sendReply } from './messages'

const ok = (data: unknown) => ({ data, error: null })
const called = (method: string) => sb.calls.filter((c) => c.method === method).map((c) => c.args)

beforeEach(() => {
  sb.calls.length = 0
  sb.results = {}
})

describe('listConversations', () => {
  const row = (over: object) => ({
    id: 'c1',
    user_a: 'me',
    user_b: 'you',
    project_id: 'p1',
    pin_id: null,
    pins: null,
    last_message_at: '2026-11-10T12:00:00Z',
    projects: { name: 'Casa Azul' },
    messages: [{ body: 'Hola', sender_id: 'you', sender_name: 'Ana', created_at: '2026-11-10T12:00:00Z' }],
    ...over,
  })

  it('maps rows to what the inbox shows, with the unread count per conversation', async () => {
    sb.results = {
      conversations: ok([row({}), row({ id: 'c2', user_a: 'you', user_b: 'me', projects: null, project_id: null, messages: [] })]),
      messages: ok([{ conversation_id: 'c1' }, { conversation_id: 'c1' }]),
    }
    const [first, second] = await listConversations('me')
    expect(first).toEqual({
      id: 'c1',
      otherId: 'you',
      projectId: 'p1',
      projectName: 'Casa Azul',
      pinId: null,
      pinTitle: null,
      otherName: 'Ana',
      lastMessage: { body: 'Hola', fromMe: false, createdAt: '2026-11-10T12:00:00Z' },
      lastMessageAt: '2026-11-10T12:00:00Z',
      unread: 2,
    })
    expect(second).toMatchObject({ otherId: 'you', projectName: null, lastMessage: null, unread: 0 })
  })

  it('does not take my own name for the other person’s', async () => {
    sb.results = {
      conversations: ok([row({ messages: [{ body: 'Hola', sender_id: 'me', sender_name: 'Yo', created_at: 'x' }] })]),
      messages: ok([]),
    }
    const [c] = await listConversations('me')
    expect(c).toMatchObject({ otherName: '', lastMessage: { fromMe: true } })
  })

  it('only lists conversations the user takes part in (admins can read all of them)', async () => {
    sb.results = { conversations: ok([]), messages: ok([]) }
    await listConversations('me')
    expect(called('or')).toContainEqual(['user_a.eq.me,user_b.eq.me'])
  })

  it('counts only what the user received and has not read', async () => {
    sb.results = { conversations: ok([]), messages: ok([]) }
    await listConversations('me')
    expect(called('eq')).toContainEqual(['recipient_id', 'me'])
    expect(called('is')).toContainEqual(['read_at', null])
  })

  it('fails with a message ready to show', async () => {
    sb.results = { conversations: { data: null, error: { message: 'internal' } }, messages: ok([]) }
    await expect(listConversations('me')).rejects.toThrow('No se pudieron cargar tus mensajes')
  })
})

describe('listThread', () => {
  it('returns the messages oldest first', async () => {
    sb.results = { messages: ok([{ id: 'new' }, { id: 'old' }]) }
    expect((await listThread('c1')).map((m) => m.id)).toEqual(['old', 'new'])
    expect(called('eq')).toContainEqual(['conversation_id', 'c1'])
  })

  it('fails with a message ready to show', async () => {
    sb.results = { messages: { data: null, error: { message: 'internal' } } }
    await expect(listThread('c1')).rejects.toThrow('No se pudieron cargar tus mensajes')
  })
})

describe('sendReply in a pin thread', () => {
  it('keeps the pin so the reply stays in the same thread', async () => {
    sb.results = { messages: ok({ id: 'm1' }) }
    await sendReply({ otherId: 'you', projectId: null, pinId: 'pin1' }, 'Hola')
    expect(called('insert')).toEqual([[{ recipient_id: 'you', project_id: null, pin_id: 'pin1', body: 'Hola' }]])
  })
})

describe('sendReply', () => {
  it('names the recipient and the project; the database decides the sender and the thread', async () => {
    sb.results = { messages: ok({ id: 'm1' }) }
    await expect(sendReply({ otherId: 'you', projectId: 'p1', pinId: null }, '  Hola ')).resolves.toEqual({ id: 'm1' })
    expect(called('insert')).toEqual([[{ recipient_id: 'you', project_id: 'p1', pin_id: null, body: 'Hola' }]])
  })

  it('explains a permission rejection and hides other errors', async () => {
    sb.results = { messages: { data: null, error: { code: '42501', message: 'rls' } } }
    await expect(sendReply({ otherId: 'you', projectId: null, pinId: null }, 'Hola')).rejects.toThrow('Tu cuenta no puede enviar mensajes')
    sb.results = { messages: { data: null, error: { code: '500', message: 'internal' } } }
    await expect(sendReply({ otherId: 'you', projectId: null, pinId: null }, 'Hola')).rejects.toThrow('No se pudo enviar el mensaje')
  })
})

describe('markConversationRead', () => {
  it('marks only what the user received and had not read', async () => {
    sb.results = { messages: ok(null) }
    await markConversationRead('c1', 'me')
    expect(called('update')[0][0]).toEqual({ read_at: expect.any(String) })
    expect(called('eq')).toEqual([['conversation_id', 'c1'], ['recipient_id', 'me']])
    expect(called('is')).toEqual([['read_at', null]])
  })

  it('throws when the update fails', async () => {
    sb.results = { messages: { data: null, error: { message: 'boom' } } }
    await expect(markConversationRead('c1', 'me')).rejects.toThrow('boom')
  })
})
