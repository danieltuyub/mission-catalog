import i18n, { tError } from '../i18n'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { listUsers, userLabel, type AdminUser } from '../services/adminUsers'

/** Every user (admins only), plus a lookup of the names to show next to ids. */
export function useUsers() {
  const [result, setResult] = useState<{ users: AdminUser[] | null; error: string | null } | null>(null)
  const [version, setVersion] = useState(0)
  const reload = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    let cancelled = false
    listUsers().then(
      (users) => !cancelled && setResult({ users, error: null }),
      (e: unknown) => !cancelled && setResult({ users: null, error: e instanceof Error ? e.message : tError('generic') }),
    )
    return () => {
      cancelled = true
    }
  }, [version])

  const users = result?.users ?? null
  const nameOf = useMemo(() => {
    const names = new Map((users ?? []).map((u) => [u.id, userLabel(u)]))
    return (id: string | null) => (id ? (names.get(id) ?? i18n.t('user.deleted')) : i18n.t('user.unassigned'))
  }, [users])

  return { users: users ?? [], loading: result === null, error: result?.error ?? null, reload, nameOf }
}
