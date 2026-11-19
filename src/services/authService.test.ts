import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const sb = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChange: vi.fn(),
  rpc: vi.fn(),
  maybeSingle: vi.fn(),
  update: vi.fn(),
}))

vi.mock('./supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: sb.signInWithPassword,
      signOut: sb.signOut,
      onAuthStateChange: sb.onAuthStateChange,
    },
    rpc: sb.rpc,
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: sb.maybeSingle }) }),
      update: (values: unknown) => ({ eq: () => ({ select: () => sb.update(values) }) }),
    }),
  },
}))

// setup.ts mocks the module globally; these tests need the real one.
const { getAuthSnapshot, setProfileNames, signIn, signOut, subscribeAuth } = await vi.importActual<
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

  it('tells a blocked account why it cannot sign in', async () => {
    sb.signInWithPassword.mockResolvedValue({ error: { code: 'user_banned' } })
    await expect(signIn('a@b.com', 'x')).rejects.toThrow('Tu cuenta está bloqueada')
  })

  it('uses a generic message for other errors', async () => {
    sb.signInWithPassword.mockResolvedValue({ error: { code: 'unexpected_failure' } })
    await expect(signIn('a@b.com', 'x')).rejects.toThrow('No se pudo iniciar sesión')
  })
})

describe('signOut', () => {
  it('records the logout before the session goes, and signs out even if that fails', async () => {
    const order: string[] = []
    sb.rpc.mockImplementation(async () => {
      order.push('audit')
      throw new Error('offline')
    })
    sb.signOut.mockImplementation(async () => {
      order.push('signOut')
      return { error: null }
    })
    await expect(signOut()).resolves.toBeUndefined()
    expect(order).toEqual(['audit', 'signOut'])
    expect(sb.rpc).toHaveBeenCalledWith('audit_logout')
    sb.rpc.mockReset()
  })

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

  it('resolves the permissions for a session and clears them on sign out', async () => {
    sb.rpc.mockResolvedValue({ data: { roles: ['creator'], permissions: ['projects.create'] }, error: null })
    sb.maybeSingle.mockResolvedValue({ data: { first_name: 'Ana', last_name: 'Pérez' }, error: null })
    emit('INITIAL_SESSION', { user: { id: 'u1', email: 'a@b.com' } })
    await vi.waitFor(() =>
      expect(getAuthSnapshot()).toEqual({
        loading: false,
        userId: 'u1',
        email: 'a@b.com',
        permissions: ['projects.create'],
        firstName: 'Ana',
        lastName: 'Pérez',
        mustChangePassword: false,
      }),
    )
    expect(sb.rpc).toHaveBeenCalledWith('my_permissions')

    emit('SIGNED_OUT', null)
    await vi.waitFor(() =>
      expect(getAuthSnapshot()).toEqual({
        loading: false,
        userId: null,
        email: null,
        permissions: [],
        firstName: '',
        lastName: '',
        mustChangePassword: false,
      }),
    )
    expect(listener).toHaveBeenCalled()
  })

  it('takes the language from the profile, or saves the one in use when the profile has none', async () => {
    const { currentLanguage, setLanguage } = await import('../i18n')
    sb.rpc.mockResolvedValue({ data: { roles: ['subscriber'], permissions: [] }, error: null })
    sb.update.mockResolvedValue({ data: [{ user_id: 'u8' }], error: null })

    sb.maybeSingle.mockResolvedValue({ data: { first_name: '', last_name: '', language: 'en' }, error: null })
    emit('SIGNED_IN', { user: { id: 'u8', email: 'l@b.com' } })
    await vi.waitFor(() => expect(currentLanguage()).toBe('en'))

    await setLanguage('es')
    sb.maybeSingle.mockResolvedValue({ data: { first_name: '', last_name: '', language: null }, error: null })
    emit('SIGNED_IN', { user: { id: 'u9', email: 'm@b.com' } })
    await vi.waitFor(() => expect(sb.update).toHaveBeenCalledWith({ language: 'es' }))
    expect(currentLanguage()).toBe('es')
  })

  it('knows when the account must choose its own password, before anything else loads', async () => {
    sb.rpc.mockResolvedValue({ data: { roles: ['subscriber'], permissions: [] }, error: null })
    sb.maybeSingle.mockResolvedValue({ data: null, error: null })
    emit('SIGNED_IN', { user: { id: 'u7', email: 'n@b.com', user_metadata: { must_change_password: true } } })
    await vi.waitFor(() => expect(getAuthSnapshot()).toMatchObject({ userId: 'u7', mustChangePassword: true }))
    emit('USER_UPDATED', { user: { id: 'u7', email: 'n@b.com', user_metadata: { must_change_password: false } } })
    await vi.waitFor(() => expect(getAuthSnapshot().mustChangePassword).toBe(false))
  })

  it('has no permissions when loading them fails', async () => {
    sb.rpc.mockResolvedValue({ data: null, error: new Error('x') })
    sb.maybeSingle.mockResolvedValue({ data: null, error: null })
    emit('SIGNED_IN', { user: { id: 'u2', email: 'c@d.com' } })
    await vi.waitFor(() =>
      expect(getAuthSnapshot()).toEqual({
        loading: false,
        userId: 'u2',
        email: 'c@d.com',
        permissions: [],
        firstName: '',
        lastName: '',
        mustChangePassword: false,
      }),
    )
  })

  it('has no permissions when the response is malformed', async () => {
    sb.rpc.mockResolvedValue({ data: { permissions: 'nope' }, error: null })
    sb.maybeSingle.mockResolvedValue({ data: null, error: null })
    emit('SIGNED_IN', { user: { id: 'u3', email: 'e@f.com' } })
    await vi.waitFor(() =>
      expect(getAuthSnapshot()).toEqual({
        loading: false,
        userId: 'u3',
        email: 'e@f.com',
        permissions: [],
        firstName: '',
        lastName: '',
        mustChangePassword: false,
      }),
    )
  })

  it('keeps the session and permissions when the profile cannot be loaded', async () => {
    sb.rpc.mockResolvedValue({ data: { permissions: ['projects.save'] }, error: null })
    sb.maybeSingle.mockResolvedValue({ data: null, error: new Error('rls') })
    emit('SIGNED_IN', { user: { id: 'u4', email: 'g@h.com' } })
    await vi.waitFor(() =>
      expect(getAuthSnapshot()).toEqual({
        loading: false,
        userId: 'u4',
        email: 'g@h.com',
        permissions: ['projects.save'],
        firstName: '',
        lastName: '',
        mustChangePassword: false,
      }),
    )
  })

  it('setProfileNames updates the names and notifies subscribers', () => {
    listener.mockClear()
    setProfileNames('Lucía', 'Gómez')
    expect(getAuthSnapshot()).toMatchObject({ userId: 'u4', firstName: 'Lucía', lastName: 'Gómez' })
    expect(listener).toHaveBeenCalled()
  })
})
