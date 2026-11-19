import { beforeEach, describe, expect, it, vi } from 'vitest'

const sb = vi.hoisted(() => {
  const calls: [string, ...unknown[]][] = []
  const result = { data: [] as unknown[], error: null as unknown, count: 0 }
  const chain: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'gte', 'lt', 'order', 'range']) {
    chain[m] = (...args: unknown[]) => {
      calls.push([m, ...args])
      return m === 'range' ? Promise.resolve(result) : chain
    }
  }
  return { calls, result, chain }
})
vi.mock('./supabaseClient', () => ({ supabase: { from: () => sb.chain } }))

import { listAuditLog } from './auditLog'

const row = { id: 7, created_at: '2026-11-18T10:00:00Z', actor_id: 'u1', actor_email: 'a@b.co', action: 'user.blocked', entity_type: 'user', entity_id: 'u2', entity_label: 'x@y.co', before: null, after: { banned_until: null } }

beforeEach(() => {
  sb.calls.length = 0
  Object.assign(sb.result, { data: [row], error: null, count: 61 })
})

describe('listAuditLog', () => {
  it('asks for the newest first, one page at a time, with the total', async () => {
    const { entries, total } = await listAuditLog({ page: 3, pageSize: 25 })
    expect(total).toBe(61)
    expect(entries[0]).toMatchObject({ id: 7, actorId: 'u1', actorEmail: 'a@b.co', action: 'user.blocked', entityLabel: 'x@y.co' })
    expect(sb.calls).toContainEqual(['select', '*', { count: 'exact' }])
    expect(sb.calls).toContainEqual(['order', 'created_at', { ascending: false }])
    expect(sb.calls).toContainEqual(['range', 50, 74])
  })

  it('filters by user, action and whole local days (the last one included)', async () => {
    await listAuditLog({ page: 1, pageSize: 25, actorId: 'u1', action: 'auth.login', from: '2026-11-01', to: '2026-11-30' })
    expect(sb.calls).toContainEqual(['eq', 'actor_id', 'u1'])
    expect(sb.calls).toContainEqual(['eq', 'action', 'auth.login'])
    expect(sb.calls).toContainEqual(['gte', 'created_at', new Date(2026, 10, 1).toISOString()])
    expect(sb.calls).toContainEqual(['lt', 'created_at', new Date(2026, 11, 1).toISOString()])
  })

  it('says it could not load', async () => {
    sb.result.error = { message: 'rls' }
    await expect(listAuditLog({ page: 1, pageSize: 25 })).rejects.toThrow('No se pudo cargar el registro de auditoría')
  })
})
