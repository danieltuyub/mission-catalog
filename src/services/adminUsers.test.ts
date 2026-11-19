import { beforeEach, describe, expect, it, vi } from 'vitest'

const sb = vi.hoisted(() => ({
  rpc: vi.fn(),
  invoke: vi.fn(),
  result: { data: null as unknown, error: null as unknown },
  updated: [] as unknown[],
}))

vi.mock('./supabaseClient', () => ({
  supabase: {
    rpc: sb.rpc,
    functions: { invoke: sb.invoke },
    from: () => {
      const builder: Record<string, unknown> = {
        then: (resolve: (v: unknown) => unknown) => Promise.resolve(sb.result).then(resolve),
      }
      for (const m of ['update', 'eq', 'select']) {
        builder[m] = (...args: unknown[]) => {
          if (m === 'update') sb.updated.push(args[0])
          return builder
        }
      }
      return builder
    },
  },
}))

import { INDEFINITE, blockState, createUser, listUsers, setUserBan, setUserRole, updateUserName, userLabel } from './adminUsers'

beforeEach(() => {
  sb.rpc.mockReset()
  sb.result = { data: [{ user_id: 'u1' }], error: null }
  sb.updated.length = 0
})

describe('listUsers', () => {
  it('maps rows and keeps the highest role', async () => {
    sb.rpc.mockResolvedValue({
      data: [
        { user_id: 'u1', email: 'a@b.com', first_name: 'Ana', last_name: 'Paz', roles: ['subscriber', 'creator'], created_at: 'c', last_sign_in_at: null },
        { user_id: 'u2', email: null, first_name: '', last_name: '', roles: [], created_at: 'c', last_sign_in_at: 'l' },
      ],
      error: null,
    })
    const [a, b] = await listUsers()
    expect(sb.rpc).toHaveBeenCalledWith('admin_list_users')
    expect(a).toMatchObject({ id: 'u1', email: 'a@b.com', role: 'creator', lastSignInAt: null })
    expect(b).toMatchObject({ id: 'u2', email: '', role: null, lastSignInAt: 'l' })
  })

  it('fails with a message ready to show', async () => {
    sb.rpc.mockResolvedValue({ data: null, error: { message: 'forbidden' } })
    await expect(listUsers()).rejects.toThrow('No se pudieron cargar los usuarios')
  })
})

describe('blocking', () => {
  it('reads a block as active, timed or indefinite, and ignores one that already ended', () => {
    const now = new Date('2026-06-01T00:00:00Z')
    expect(blockState({ bannedUntil: null }, now)).toEqual({ kind: 'active' })
    expect(blockState({ bannedUntil: '2026-05-01T00:00:00Z' }, now)).toEqual({ kind: 'active' })
    expect(blockState({ bannedUntil: '2026-07-01T00:00:00Z' }, now)).toEqual({ kind: 'until', until: new Date('2026-07-01T00:00:00Z') })
    expect(blockState({ bannedUntil: INDEFINITE }, now)).toEqual({ kind: 'indefinite' })
  })

  it('blocks and lifts through the database function', async () => {
    sb.rpc.mockResolvedValue({ error: null })
    await setUserBan('u1', new Date('2999-01-01T00:00:00Z'))
    expect(sb.rpc).toHaveBeenCalledWith('admin_set_user_ban', { target: 'u1', until_ts: '2999-01-01T00:00:00.000Z' })
    await setUserBan('u1', null)
    expect(sb.rpc).toHaveBeenLastCalledWith('admin_set_user_ban', { target: 'u1', until_ts: null })
  })

  it('explains that your own account cannot be blocked', async () => {
    sb.rpc.mockResolvedValue({ error: { message: 'own_ban' } })
    await expect(setUserBan('me', null)).rejects.toThrow('No puedes bloquear tu propia cuenta')
  })
})

describe('setUserRole', () => {
  it('calls the database function', async () => {
    sb.rpc.mockResolvedValue({ error: null })
    await setUserRole('u1', 'creator')
    expect(sb.rpc).toHaveBeenCalledWith('admin_set_user_role', { target: 'u1', new_role: 'creator' })
  })

  it('explains that your own role cannot change', async () => {
    sb.rpc.mockResolvedValue({ error: { message: 'own_role' } })
    await expect(setUserRole('me', 'subscriber')).rejects.toThrow('No puedes cambiar tu propio rol')
  })

  it('hides other errors behind a generic message', async () => {
    sb.rpc.mockResolvedValue({ error: { message: 'boom' } })
    await expect(setUserRole('u1', 'admin')).rejects.toThrow('No se pudo completar la acción')
  })
})

describe('updateUserName', () => {
  it('trims and saves', async () => {
    await updateUserName('u1', ' Ana ', ' Paz ')
    expect(sb.updated).toEqual([{ first_name: 'Ana', last_name: 'Paz' }])
  })

  it('fails when no row was updated', async () => {
    sb.result = { data: [], error: null }
    await expect(updateUserName('u1', 'A', 'B')).rejects.toThrow()
  })
})

describe('userLabel', () => {
  it('uses the name, else the email', () => {
    expect(userLabel({ firstName: 'Ana', lastName: 'Paz', email: 'a@b.com' })).toBe('Ana Paz')
    expect(userLabel({ firstName: '', lastName: '', email: 'a@b.com' })).toBe('a@b.com')
  })
})

describe('createUser', () => {
  const input = { email: 'a@b.com', firstName: 'Ana', lastName: 'Paz', role: 'creator' as const, password: 'Abcdef123456' }

  it('asks the function and returns the new id', async () => {
    sb.invoke.mockResolvedValue({ data: { id: 'u9' }, error: null })
    await expect(createUser(input)).resolves.toBe('u9')
    expect(sb.invoke).toHaveBeenCalledWith('admin-create-user', { body: input })
  })

  it('turns the function’s error codes into messages', async () => {
    const failure = (error: string) => ({ data: null, error: { context: new Response(JSON.stringify({ error }), { status: 409 }) } })
    sb.invoke.mockResolvedValue(failure('email_exists'))
    await expect(createUser(input)).rejects.toThrow('Ya existe un usuario con ese correo')
    sb.invoke.mockResolvedValue(failure('forbidden'))
    await expect(createUser(input)).rejects.toThrow('Tu cuenta no puede crear usuarios')
  })

  it('hides anything it does not know', async () => {
    sb.invoke.mockResolvedValue({ data: null, error: { context: new Response('boom', { status: 500 }) } })
    await expect(createUser(input)).rejects.toThrow('No se pudo crear el usuario')
    sb.invoke.mockResolvedValue({ data: null, error: new Error('network') })
    await expect(createUser(input)).rejects.toThrow('No se pudo crear el usuario')
    sb.invoke.mockResolvedValue({ data: {}, error: null })
    await expect(createUser(input)).rejects.toThrow('No se pudo crear el usuario')
  })
})
