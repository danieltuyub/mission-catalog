import type { AuthState } from '../services/authService'

/** Auth states for tests (stable objects: `useSyncExternalStore` needs the same reference). */
export const SIGNED_OUT: AuthState = { loading: false, userId: null, email: null, permissions: [], firstName: '', lastName: '', mustChangePassword: false }
export const LOADING: AuthState = { ...SIGNED_OUT, loading: true }
export const ADMIN: AuthState = { loading: false, userId: 'admin-1', email: 'a@b.com', permissions: ['*'], firstName: '', lastName: '', mustChangePassword: false }

const member = ['projects.view_detail', 'projects.save', 'messages.send', 'pins.request']
export const SUBSCRIBER: AuthState = { loading: false, userId: 'sub-1', email: 's@b.com', permissions: member, firstName: '', lastName: '', mustChangePassword: false }
export const CREATOR: AuthState = {
  loading: false,
  userId: 'creator-1',
  email: 'c@b.com',
  permissions: [...member, 'projects.create', 'projects.update_own'],
  firstName: '',
  lastName: '',
  mustChangePassword: false,
}

/** A signed-in user whose profile has a name. */
export const NAMED: AuthState = { ...ADMIN, firstName: 'Ana', lastName: 'Pérez' }

/** An account an admin created: signed in, but it has to choose its own password first. */
export const MUST_CHANGE_PASSWORD: AuthState = { ...ADMIN, userId: 'new-1', permissions: ['projects.view_detail'], mustChangePassword: true }
