import { tError } from '../i18n'
import type { Session } from '@supabase/supabase-js'
import { getProfile } from './accountService'
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

async function resolve(session: Session | null) {
  const id = ++resolveId
  if (!session) return setState(SIGNED_OUT)
  const userId = session.user.id
  const email = session.user.email ?? null
  const mustChangePassword = session.user.user_metadata?.must_change_password === true
  setState({ loading: true, userId, email, permissions: [], firstName: '', lastName: '', mustChangePassword })
  const [{ data, error }, profile] = await Promise.all([
    supabase.rpc('my_permissions'),
    getProfile(userId).catch(() => null), // the name is a nicety: never block the session on it
  ])
  if (id !== resolveId) return // a newer session change won
  const permissions = !error && Array.isArray(data?.permissions) ? (data.permissions as string[]) : []
  setState({
    loading: false,
    userId,
    email,
    permissions,
    firstName: profile?.first_name ?? '',
    lastName: profile?.last_name ?? '',
    mustChangePassword,
  })
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
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
