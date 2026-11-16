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
}

interface UserRow {
  user_id: string
  email: string | null
  first_name: string
  last_name: string
  roles: string[]
  created_at: string
  last_sign_in_at: string | null
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
  }))
}

export async function setUserRole(userId: string, role: Role): Promise<void> {
  const { error } = await supabase.rpc('admin_set_user_role', { target: userId, new_role: role })
  if (!error) return
  if (error.message.includes('own_role')) throw new Error('No puedes cambiar tu propio rol')
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
