import { describe, expect, it } from 'vitest'
import { validateNewUser } from './validate'

const valid = { email: ' Ana@Example.com ', password: 'Abcdef123456', firstName: ' Ana ', lastName: 'Paz', role: 'creator' }

describe('validateNewUser', () => {
  it('accepts a complete request, tidying email and names', () => {
    expect(validateNewUser(valid)).toEqual({
      ok: true,
      value: { email: 'ana@example.com', password: 'Abcdef123456', firstName: 'Ana', lastName: 'Paz', role: 'creator' },
    })
  })

  it('does not trim the password: spaces are part of it', () => {
    const r = validateNewUser({ ...valid, password: '  secreto  ' })
    expect(r).toMatchObject({ ok: true, value: { password: '  secreto  ' } })
  })

  it('names are optional', () => {
    expect(validateNewUser({ ...valid, firstName: undefined, lastName: undefined })).toMatchObject({
      ok: true,
      value: { firstName: '', lastName: '' },
    })
  })

  it.each([
    [null, 'invalid_body'],
    ['texto', 'invalid_body'],
    [{ ...valid, email: 'no-es-correo' }, 'invalid_email'],
    [{ ...valid, email: undefined }, 'invalid_email'],
    [{ ...valid, password: 'corta' }, 'invalid_password'],
    [{ ...valid, password: 'a'.repeat(73) }, 'invalid_password'],
    [{ ...valid, password: 12345678 }, 'invalid_password'],
    [{ ...valid, firstName: 'x'.repeat(81) }, 'invalid_name'],
    [{ ...valid, role: 'root' }, 'invalid_role'],
    [{ ...valid, role: undefined }, 'invalid_role'],
  ])('rejects %j with %s', (body, error) => {
    expect(validateNewUser(body)).toEqual({ ok: false, error })
  })

  it('counts bytes for the password limit, not characters', () => {
    // 40 characters of 2 bytes each are 80 bytes: past bcrypt's 72.
    expect(validateNewUser({ ...valid, password: 'é'.repeat(40) })).toEqual({ ok: false, error: 'invalid_password' })
  })
})
