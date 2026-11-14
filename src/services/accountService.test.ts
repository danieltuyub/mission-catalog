import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
  selectAfterUpdate: vi.fn(),
  update: vi.fn(),
  updateUser: vi.fn(),
}))

vi.mock('./supabaseClient', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: m.maybeSingle }) }),
      update: m.update.mockImplementation(() => ({ eq: () => ({ select: m.selectAfterUpdate }) })),
    }),
    auth: { updateUser: m.updateUser },
  },
}))

import { changePassword, getProfile, updateProfile } from './accountService'

beforeEach(() => Object.values(m).forEach((f) => f.mockReset()))

describe('getProfile', () => {
  it('returns the profile or null', async () => {
    m.maybeSingle.mockResolvedValue({ data: { first_name: 'Ana', last_name: 'Pérez' }, error: null })
    await expect(getProfile('u1')).resolves.toEqual({ first_name: 'Ana', last_name: 'Pérez' })
    m.maybeSingle.mockResolvedValue({ data: null, error: null })
    await expect(getProfile('u1')).resolves.toBeNull()
  })

  it('throws on a database error', async () => {
    m.maybeSingle.mockResolvedValue({ data: null, error: new Error('rls') })
    await expect(getProfile('u1')).rejects.toThrow('rls')
  })
})

describe('updateProfile', () => {
  const profile = { first_name: 'Ana', last_name: 'Pérez' }

  it('updates the row', async () => {
    m.selectAfterUpdate.mockResolvedValue({ data: [{ user_id: 'u1' }], error: null })
    await updateProfile('u1', profile)
    expect(m.update).toHaveBeenCalledWith(profile)
  })

  it('fails when nothing was updated (missing profile or not yours)', async () => {
    m.selectAfterUpdate.mockResolvedValue({ data: [], error: null })
    await expect(updateProfile('u1', profile)).rejects.toThrow('No se encontró tu perfil')
  })

  it('throws on a database error', async () => {
    m.selectAfterUpdate.mockResolvedValue({ data: null, error: new Error('boom') })
    await expect(updateProfile('u1', profile)).rejects.toThrow('boom')
  })
})

describe('changePassword', () => {
  it('resolves on success', async () => {
    m.updateUser.mockResolvedValue({ error: null })
    await expect(changePassword('nueva-clave-1')).resolves.toBeUndefined()
    expect(m.updateUser).toHaveBeenCalledWith({ password: 'nueva-clave-1' })
  })

  it.each([
    ['same_password', /distinta de la actual/],
    ['weak_password', /demasiado débil/],
    ['reauthentication_needed', /vuelve a entrar/],
    ['something_else', /No se pudo cambiar/],
  ])('maps %s to a friendly message', async (code, message) => {
    m.updateUser.mockResolvedValue({ error: { code } })
    await expect(changePassword('x')).rejects.toThrow(message)
  })
})
