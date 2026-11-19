import { currentLanguage, setLanguage, tError } from '../i18n'
import type { Session } from '@supabase/supabase-js'
import { getProfile, setPreferredLanguage, type Profile } from './accountService'
import { supabase } from './supabaseClient'

export interface AuthState {
  /** True until the stored session (and its permissions) has been resolved. */
  loading: boolean
  userId: string | null
  email: string | null
  /** What the user may do (`'*'` for admins). Empty for guests. Use `can()` to check. */
  permissions: string[]
  /** From the user's profile; empty until loaded or when not filled in yet. */
  firstName: string
  lastName: string
  /** An admin created the account with a temporary password: the user must choose their own first. */
  mustChangePassword: boolean
}

const SIGNED_OUT: AuthState = { loading: false, userId: null, email: null, permissions: [], firstName: '', lastName: '', mustChangePassword: false }

let state: AuthState = { loading: true, userId: null, email: null, permissions: [], firstName: '', lastName: '', mustChangePassword: false }
let started = false
let resolveId = 0
const listeners = new Set<() => void>()

function setState(next: AuthState) {
  state = next
  listeners.forEach((l) => l())
}

/**
 * The profile's language wins over what this device had; a profile without one takes the language
 * already in use, so the next sign-in (anywhere) finds it.
 */
async function syncLanguage(userId: string, profile: Profile | null) {
  if (!profile) return
  try {
    if (profile.language) {
      if (profile.language !== currentLanguage()) await setLanguage(profile.language)
    } else {
      await setPreferredLanguage(userId, currentLanguage())
    }
  } catch {
    // A nicety: never blocks the session.
  }
}

async function resolve(session: Session | null) {
  const id = ++resolveId
  if (!session) return setState(SIGNED_OUT)
  const userId = session.user.id
  const email = session.user.email ?? null
  const mustChangePassword = session.user.user_metadata?.must_change_password === true
  // Supabase repeats SIGNED_IN (and refreshes the token) whenever the window regains focus. For the same
  // user that is not a new sign-in: showing "loading" would unmount every protected page and reload its data.
  if (state.userId === userId) setState({ ...state, email, mustChangePassword })
  else setState({ loading: true, userId, email, permissions: [], firstName: '', lastName: '', mustChangePassword })
  const [{ data, error }, profile] = await Promise.all([
    supabase.rpc('my_permissions'),
    getProfile(userId).catch(() => null), // the name is a nicety: never block the session on it
  ])
  if (id !== resolveId) return // a newer session change won
  void syncLanguage(userId, profile)
  const permissions = !error && Array.isArray(data?.permissions) ? (data.permissions as string[]) : []
  const next: AuthState = {
    loading: false,
    userId,
    email,
    permissions,
    // A profile that could not be read this time keeps the name already known.
    firstName: profile ? profile.first_name : state.userId === userId ? state.firstName : '',
    lastName: profile ? profile.last_name : state.userId === userId ? state.lastName : '',
    mustChangePassword,
  }
  // Same values as before (a refocus): nobody is told, nothing re-renders.
  const same =
    !state.loading &&
    state.userId === next.userId &&
    state.email === next.email &&
    state.firstName === next.firstName &&
    state.lastName === next.lastName &&
    state.mustChangePassword === next.mustChangePassword &&
    state.permissions.length === next.permissions.length &&
    state.permissions.every((p, i) => p === next.permissions[i])
  if (!same) setState(next)
}

function start() {
  if (started) return
  started = true
  // Fires INITIAL_SESSION on subscribe. Do not call supabase inside the callback: defer.
  supabase.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => void resolve(session), 0)
  })
}

/** Keeps the name in the navbar in sync after the user edits their profile. */
export function setProfileNames(firstName: string, lastName: string): void {
  setState({ ...state, firstName, lastName })
}

export function subscribeAuth(listener: () => void): () => void {
  start()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getAuthSnapshot(): AuthState {
  return state
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (!error) return
  if (error.code === 'user_banned') throw new Error(tError('banned'))
  throw new Error(
    error.code === 'invalid_credentials'
      ? tError('badCredentials')
      : tError('signInFailed'),
  )
}

export async function signOut(): Promise<void> {
  // Recorded before the session goes: afterwards nobody can say who it was. Never blocks signing out.
  try {
    await supabase.rpc('audit_logout')
  } catch {
    // Not recorded, still signed out.
  }
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
