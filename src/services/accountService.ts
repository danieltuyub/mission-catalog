import { supabase } from './supabaseClient'

export interface Profile {
  first_name: string
  last_name: string
}

export const MIN_PASSWORD_LENGTH = 8

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data as Profile | null
}

export async function updateProfile(userId: string, profile: Profile): Promise<void> {
  const { data, error } = await supabase.from('profiles').update(profile).eq('user_id', userId).select('user_id')
  if (error) throw error
  // RLS hides rows that are not yours, and a missing profile updates nothing: both look the same.
  if (!data || data.length === 0) throw new Error('No se encontró tu perfil')
}

const PASSWORD_ERRORS: Record<string, string> = {
  same_password: 'La nueva contraseña debe ser distinta de la actual',
  weak_password: 'La contraseña es demasiado débil: usa más caracteres y mezcla letras y números',
  reauthentication_needed: 'Por seguridad, cierra sesión, vuelve a entrar e inténtalo de nuevo',
}

export async function changePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password })
  if (!error) return
  throw new Error(PASSWORD_ERRORS[error.code ?? ''] ?? 'No se pudo cambiar la contraseña. Intenta de nuevo.')
}
