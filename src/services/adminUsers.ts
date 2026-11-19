import { supabase } from './supabaseClient'

export type Role = 'subscriber' | 'creator' | 'admin'

export const ROLES: readonly { id: Role; label: string }[] = [
  { id: 'subscriber', label: 'Suscriptor' },
  { id: 'creator', label: 'Creador' },
  { id: 'admin', label: 'Administrador' },
]

export const roleLabel = (role: Role | null) => ROLES.find((r) => r.id === role)?.label ?? 'Sin rol'

export interface AdminUser {
  id: string
  email: string
  firstName: string
  lastName: string
  /** The highest role held; null when none. */
  role: Role | null
  createdAt: string
  lastSignInAt: string | null
  /** Blocked until this moment (ISO); null when never blocked. May be in the past: see `blockState`. */
  bannedUntil: string | null
}

interface UserRow {
  user_id: string
  email: string | null
  first_name: string
  last_name: string
  roles: string[]
  created_at: string
  last_sign_in_at: string | null
  banned_until?: string | null
}

const FAILED = 'No se pudo completar la acción. Inténtalo de nuevo.'

/** Name for lists: "First Last", else the email. */
export const userLabel = (u: Pick<AdminUser, 'firstName' | 'lastName' | 'email'>) =>
  `${u.firstName} ${u.lastName}`.trim() || u.email

const highest = (roles: string[]): Role | null =>
  (['admin', 'creator', 'subscriber'] as const).find((r) => roles.includes(r)) ?? null

/** Every user, newest first (admins only: the database refuses anyone else). */
export async function listUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase.rpc('admin_list_users')
  if (error) throw new Error('No se pudieron cargar los usuarios. Inténtalo de nuevo.')
  return (data as UserRow[]).map((r) => ({
    id: r.user_id,
    email: r.email ?? '',
    firstName: r.first_name,
    lastName: r.last_name,
    role: highest(r.roles),
    createdAt: r.created_at,
    lastSignInAt: r.last_sign_in_at,
    bannedUntil: r.banned_until ?? null,
  }))
}

export async function setUserRole(userId: string, role: Role): Promise<void> {
  const { error } = await supabase.rpc('admin_set_user_role', { target: userId, new_role: role })
  if (!error) return
  if (error.message.includes('own_role')) throw new Error('No puedes cambiar tu propio rol')
  throw new Error(FAILED)
}

/** "Indefinitely" is a date this far away: the database has no other way to say "no end". */
export const INDEFINITE = '2999-01-01T00:00:00Z'

export type BlockState = { kind: 'active' } | { kind: 'until'; until: Date } | { kind: 'indefinite' }

export function blockState(u: Pick<AdminUser, 'bannedUntil'>, now = new Date()): BlockState {
  if (!u.bannedUntil) return { kind: 'active' }
  const until = new Date(u.bannedUntil)
  if (until <= now) return { kind: 'active' }
  return until >= new Date(INDEFINITE) ? { kind: 'indefinite' } : { kind: 'until', until }
}

/** Blocks the account until `until`, or lifts the block with null (admins only). */
export async function setUserBan(userId: string, until: Date | null): Promise<void> {
  const { error } = await supabase.rpc('admin_set_user_ban', { target: userId, until_ts: until ? until.toISOString() : null })
  if (!error) return
  if (error.message.includes('own_ban')) throw new Error('No puedes bloquear tu propia cuenta')
  throw new Error(FAILED)
}

export async function updateUserName(userId: string, firstName: string, lastName: string): Promise<void> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ first_name: firstName.trim(), last_name: lastName.trim() })
    .eq('user_id', userId)
    .select('user_id')
  if (error || !data || data.length === 0) throw new Error(FAILED)
}

export interface NewUserInput {
  email: string
  firstName: string
  lastName: string
  role: Role
  password: string
}

/** What the function answers, by code, in words for the admin. */
const CREATE_ERRORS: Record<string, string> = {
  email_exists: 'Ya existe un usuario con ese correo',
  invalid_email: 'Escribe un correo válido',
  invalid_password: 'La contraseña debe tener entre 8 y 72 caracteres',
  invalid_name: 'El nombre o el apellido es demasiado largo',
  invalid_role: 'Elige un rol válido',
  forbidden: 'Tu cuenta no puede crear usuarios',
  unauthorized: 'Tu sesión expiró: vuelve a iniciar sesión',
}

async function errorCode(error: unknown): Promise<string | null> {
  const response = (error as { context?: unknown } | null)?.context
  if (!(response instanceof Response)) return null
  try {
    const body = (await response.json()) as { error?: unknown }
    return typeof body.error === 'string' ? body.error : null
  } catch {
    return null
  }
}

/**
 * Creates an account with a temporary password (admins only). It goes through the `admin-create-user`
 * function: creating accounts needs a key that must never reach the browser. Returns the new user's id.
 */
export async function createUser(input: NewUserInput): Promise<string> {
  const { data, error } = await supabase.functions.invoke('admin-create-user', { body: input })
  if (error) {
    const code = await errorCode(error)
    throw new Error((code && CREATE_ERRORS[code]) || 'No se pudo crear el usuario. Inténtalo de nuevo.')
  }
  const id = (data as { id?: unknown } | null)?.id
  if (typeof id !== 'string') throw new Error('No se pudo crear el usuario. Inténtalo de nuevo.')
  return id
}
