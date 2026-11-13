import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'

export interface AuthState {
  /** True until the stored session (and its role) has been resolved. */
  loading: boolean
  email: string | null
  isAdmin: boolean
}

const SIGNED_OUT: AuthState = { loading: false, email: null, isAdmin: false }

let state: AuthState = { loading: true, email: null, isAdmin: false }
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
  const email = session.user.email ?? null
  setState({ loading: true, email, isAdmin: false })
  const { data, error } = await supabase.rpc('is_admin')
  if (id !== resolveId) return // a newer session change won
  setState({ loading: false, email, isAdmin: !error && data === true })
}

function start() {
  if (started) return
  started = true
  // Fires INITIAL_SESSION on subscribe. Do not call supabase inside the callback: defer.
  supabase.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => void resolve(session), 0)
  })
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
  throw new Error(
    error.code === 'invalid_credentials'
      ? 'Correo o contraseña incorrectos'
      : 'No se pudo iniciar sesión. Intenta de nuevo.',
  )
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
