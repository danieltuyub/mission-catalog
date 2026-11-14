import type { Project } from '../types'
import type { AuthState } from './authService'

/** Admins hold `'*'`. This only decides what to show: the database enforces every rule. */
export function can(auth: Pick<AuthState, 'permissions'>, permission: string): boolean {
  return auth.permissions.includes('*') || auth.permissions.includes(permission)
}

/** Any project for admins; only their own for creators. */
export function canEditProject(auth: Pick<AuthState, 'permissions' | 'userId'>, project: Pick<Project, 'created_by'>): boolean {
  if (can(auth, 'projects.update_any')) return true
  return can(auth, 'projects.update_own') && !!auth.userId && project.created_by === auth.userId
}
