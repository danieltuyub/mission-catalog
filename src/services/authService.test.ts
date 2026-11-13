import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const sb = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChange: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('./supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: sb.signInWithPassword,
      signOut: sb.signOut,
      onAuthStateChange: sb.onAuthStateChange,
    },
    rpc: sb.rpc,
  },
}))

// setup.ts mocks the module globally; these tests need the real one.
const { getAuthSnapshot, signIn, signOut, subscribeAuth } = await vi.importActual<
  typeof import('./authService')
>('./authService')

describe('signIn', () => {
  beforeEach(() => sb.signInWithPassword.mockReset())

  it('resolves on success', async () => {
    sb.signInWithPassword.mockResolvedValue({ error: null })
    await expect(signIn('a@b.com', 'x')).resolves.toBeUndefined()
    expect(sb.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: 'x' })
  })

  it('maps bad credentials to a friendly message', async () => {
    sb.signInWithPassword.mockResolvedValue({ error: { code: 'invalid_credentials' } })
    await expect(signIn('a@b.com', 'x')).rejects.toThrow('Correo o contraseña incorrectos')
  })

  it('uses a generic message for other errors', async () => {
    sb.signInWithPassword.mockResolvedValue({ error: { code: 'unexpected_failure' } })
    await expect(signIn('a@b.com', 'x')).rejects.toThrow('No se pudo iniciar sesión')
  })
})

describe('signOut', () => {
  it('throws when Supabase fails', async () => {
    sb.signOut.mockResolvedValue({ error: new Error('boom') })
    await expect(signOut()).rejects.toThrow('boom')
  })
})

describe('auth state', () => {
  // The service subscribes to Supabase once per module, so capture the callback once.
  let emit!: (event: string, session: unknown) => void
  const listener = vi.fn()
  beforeAll(() => {
    sb.onAuthStateChange.mockImplementation((cb) => {
      emit = cb
      return { data: { subscription: { unsubscribe() {} } } }
    })
    subscribeAuth(listener)
  })

  it('starts loading', () => {
    expect(getAuthSnapshot().loading).toBe(true)
  })

  it('resolves the role from is_admin for a session and clears on sign out', async () => {
    sb.rpc.mockResolvedValue({ data: true, error: null })
    emit('INITIAL_SESSION', { user: { email: 'a@b.com' } })
    await vi.waitFor(() =>
      expect(getAuthSnapshot()).toEqual({ loading: false, email: 'a@b.com', isAdmin: true }),
    )
    expect(sb.rpc).toHaveBeenCalledWith('is_admin')

    emit('SIGNED_OUT', null)
    await vi.waitFor(() =>
      expect(getAuthSnapshot()).toEqual({ loading: false, email: null, isAdmin: false }),
    )
    expect(listener).toHaveBeenCalled()
  })

  it('is not admin when the role check fails', async () => {
    sb.rpc.mockResolvedValue({ data: null, error: new Error('x') })
    emit('SIGNED_IN', { user: { email: 'c@d.com' } })
    await vi.waitFor(() =>
      expect(getAuthSnapshot()).toEqual({ loading: false, email: 'c@d.com', isAdmin: false }),
    )
  })
})
