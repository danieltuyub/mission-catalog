import { beforeEach, describe, expect, it, vi } from 'vitest'

const sb = vi.hoisted(() => ({
  isNull: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
  on: vi.fn(),
  subscribe: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn(),
}))

vi.mock('./supabaseClient', () => ({
  supabase: {
    from: (table: string) => ({
      select: (cols: string, opts: unknown) => ({
        eq: (c: string, v: string) => ({ is: (c2: string, v2: unknown) => sb.isNull(table, cols, opts, [c, v], [c2, v2]) }),
      }),
    }),
    channel: sb.channel,
    removeChannel: sb.removeChannel,
  },
}))

// setup.ts mocks the module globally; these tests need the real one.
const { countUnreadMessages, subscribeToMessages } = await vi.importActual<typeof import('./unreadMessages')>('./unreadMessages')

beforeEach(() => {
  Object.values(sb).forEach((fn) => fn.mockReset())
  const channel = { on: sb.on, subscribe: sb.subscribe }
  sb.on.mockReturnValue(channel)
  sb.subscribe.mockReturnValue(channel)
  sb.channel.mockReturnValue(channel)
})

describe('countUnreadMessages', () => {
  it('counts the messages addressed to the user with no read date, without loading rows', async () => {
    sb.isNull.mockResolvedValue({ count: 4, error: null })
    await expect(countUnreadMessages('u1')).resolves.toBe(4)
    expect(sb.isNull).toHaveBeenCalledWith('messages', 'id', { count: 'exact', head: true }, ['recipient_id', 'u1'], ['read_at', null])
  })

  it('is 0 without a count', async () => {
    sb.isNull.mockResolvedValue({ count: null, error: null })
    await expect(countUnreadMessages('u1')).resolves.toBe(0)
  })

  it('throws when Supabase fails', async () => {
    sb.isNull.mockResolvedValue({ count: null, error: { message: 'boom' } })
    await expect(countUnreadMessages('u1')).rejects.toThrow('boom')
  })
})

describe('subscribeToMessages', () => {
  it('listens to changes of the user\'s own incoming messages and can stop', () => {
    const onChange = vi.fn()
    const stop = subscribeToMessages('u1', onChange)
    expect(sb.channel).toHaveBeenCalledWith('messages-for-u1')
    expect(sb.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'messages', filter: 'recipient_id=eq.u1' },
      onChange,
    )
    expect(sb.subscribe).toHaveBeenCalled()
    expect(sb.removeChannel).not.toHaveBeenCalled()
    stop()
    expect(sb.removeChannel).toHaveBeenCalled()
  })
})
