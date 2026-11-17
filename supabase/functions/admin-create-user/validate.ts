// Pure input checks, kept apart from the Deno handler so they can be unit-tested with vitest.

export const ROLES = ['subscriber', 'creator', 'admin'] as const
export type Role = (typeof ROLES)[number]

export const MIN_PASSWORD_LENGTH = 8
/** bcrypt, which Supabase Auth uses, ignores everything after 72 bytes. */
export const MAX_PASSWORD_LENGTH = 72
export const MAX_NAME_LENGTH = 80

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface NewUserInput {
  email: string
  password: string
  firstName: string
  lastName: string
  role: Role
}

export type Validation = { ok: true; value: NewUserInput } | { ok: false; error: string }

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

/** The request body as the function accepts it; `error` is a stable code the app turns into a message. */
export function validateNewUser(body: unknown): Validation {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'invalid_body' }
  const b = body as Record<string, unknown>

  const email = text(b.email).toLowerCase()
  if (!EMAIL.test(email) || email.length > 254) return { ok: false, error: 'invalid_email' }

  const password = typeof b.password === 'string' ? b.password : ''
  if (password.length < MIN_PASSWORD_LENGTH || new TextEncoder().encode(password).length > MAX_PASSWORD_LENGTH) {
    return { ok: false, error: 'invalid_password' }
  }

  const firstName = text(b.firstName)
  const lastName = text(b.lastName)
  if (firstName.length > MAX_NAME_LENGTH || lastName.length > MAX_NAME_LENGTH) return { ok: false, error: 'invalid_name' }

  const role = ROLES.find((r) => r === b.role)
  if (!role) return { ok: false, error: 'invalid_role' }

  return { ok: true, value: { email, password, firstName, lastName, role } }
}
