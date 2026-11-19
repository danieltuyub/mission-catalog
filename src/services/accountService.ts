import { isLanguage, tError, type Language } from '../i18n'
import { supabase } from './supabaseClient'

export interface ProfileNames {
  first_name: string
  last_name: string
}

export interface Profile extends ProfileNames {
  /** The preferred interface language; null while none is chosen. */
  language: Language | null
}

export const MIN_PASSWORD_LENGTH = 8

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('first_name, last_name, language')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const row = data as Profile
  return { ...row, language: isLanguage(row.language) ? row.language : null }
}

/** Saves the user's preferred language (null clears it). The database lets everyone edit their own, and admins anyone's. */
export async function setPreferredLanguage(userId: string, language: Language | null): Promise<void> {
  const { data, error } = await supabase.from('profiles').update({ language }).eq('user_id', userId).select('user_id')
  if (error || !data || data.length === 0) throw new Error(tError('actionFailed'))
}

export async function updateProfile(userId: string, profile: ProfileNames): Promise<void> {
  const { data, error } = await supabase.from('profiles').update(profile).eq('user_id', userId).select('user_id')
  if (error) throw error
  // RLS hides rows that are not yours, and a missing profile updates nothing: both look the same.
  if (!data || data.length === 0) throw new Error(tError('profileNotFound'))
}

const PASSWORD_ERRORS = {
  same_password: 'samePassword',
  weak_password: 'weakPassword',
  reauthentication_needed: 'reauth',
} as const

const passwordError = (code: string | undefined) => tError(PASSWORD_ERRORS[(code ?? '') as keyof typeof PASSWORD_ERRORS] ?? 'passwordFailed')

export async function changePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password })
  if (!error) return
  throw new Error(passwordError(error.code))
}

/**
 * First sign-in of an account an admin created: sets the user's own password and lifts the
 * "must change" mark in the same call, so the app lets them in.
 */
export async function completeFirstPassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password, data: { must_change_password: false } })
  if (!error) return
  throw new Error(passwordError(error.code))
}
