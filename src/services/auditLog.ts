import { tError } from '../i18n'
import { supabase } from './supabaseClient'

/** Everything the trail records, in the order the filter lists them. The database writes them (see the audit_log migration). */
export const AUDIT_ACTIONS = [
  'auth.login',
  'auth.logout',
  'pin_request.created',
  'pin_request.approved',
  'pin_request.rejected',
  'pin_request.reopened',
  'pin.updated',
  'pin.contact_changed',
  'pin.deleted',
  'project.updated',
  'project.images_changed',
  'project.deleted',
  'user.created',
  'user.profile_updated',
  'user.role_changed',
  'user.blocked',
  'user.unblocked',
  'user.deleted',
] as const
export type AuditAction = (typeof AUDIT_ACTIONS)[number]

export const PAGE_SIZES = [25, 50, 100] as const

export interface AuditEntry {
  id: number
  createdAt: string
  actorId: string | null
  actorEmail: string | null
  /** Usually one of `AUDIT_ACTIONS`; an older or newer database may hold others. */
  action: string
  entityType: string
  entityId: string | null
  entityLabel: string | null
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
}

interface Row {
  id: number
  created_at: string
  actor_id: string | null
  actor_email: string | null
  action: string
  entity_type: string
  entity_id: string | null
  entity_label: string | null
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
}

export interface AuditQuery {
  /** 1-based. */
  page: number
  pageSize: number
  actorId?: string
  action?: string
  /** Local days, `YYYY-MM-DD`, both included. */
  from?: string
  to?: string
}

/** Midnight (local) of a `YYYY-MM-DD` day, plus `days`, as an instant. */
function dayStart(day: string, days = 0): string {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d + days).toISOString()
}

/** One page of the trail, newest first, and how many entries match in all. */
export async function listAuditLog(query: AuditQuery): Promise<{ entries: AuditEntry[]; total: number }> {
  let request = supabase.from('audit_log').select('*', { count: 'exact' })
  if (query.actorId) request = request.eq('actor_id', query.actorId)
  if (query.action) request = request.eq('action', query.action)
  if (query.from) request = request.gte('created_at', dayStart(query.from))
  if (query.to) request = request.lt('created_at', dayStart(query.to, 1))

  const first = (query.page - 1) * query.pageSize
  const { data, error, count } = await request
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(first, first + query.pageSize - 1)
  if (error) throw new Error(tError('loadAudit'))

  return {
    total: count ?? 0,
    entries: (data as Row[]).map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      actorId: r.actor_id,
      actorEmail: r.actor_email,
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      entityLabel: r.entity_label,
      before: r.before,
      after: r.after,
    })),
  }
}
