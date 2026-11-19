import { useEffect, useState } from 'react'
import { can } from '../services/permissions'
import { countUnreadContacts, subscribeToContacts } from '../services/contactMessages'
import { useAuth } from './useAuth'

/** How many contact-form messages nobody has read. Live; 0 for anyone who is not an admin. */
export function useUnreadContacts(): number {
  const auth = useAuth()
  const userId = auth.loading || !can(auth, 'users.manage') ? null : auth.userId
  const [result, setResult] = useState<{ userId: string; count: number } | null>(null)

  useEffect(() => {
    if (!userId) return
    let active = true
    let latest = 0
    const refresh = () => {
      const request = ++latest
      countUnreadContacts().then(
        (count) => active && request === latest && setResult({ userId, count }),
        () => {},
      )
    }
    refresh()
    const stop = subscribeToContacts(refresh)
    const onVisible = () => document.visibilityState === 'visible' && refresh()
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      active = false
      stop()
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [userId])

  return result && result.userId === userId ? result.count : 0
}
