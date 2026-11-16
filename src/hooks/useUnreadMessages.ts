import { useEffect, useState } from 'react'
import { can } from '../services/permissions'
import { countUnreadMessages, subscribeToMessages } from '../services/unreadMessages'
import { useAuth } from './useAuth'

/** How many messages the signed-in user has not read. Live; 0 for guests and without messaging. */
export function useUnreadMessages(): number {
  const auth = useAuth()
  const userId = auth.loading || !can(auth, 'messages.send') ? null : auth.userId
  // Remembers whose count it is, so a previous user's number is never shown to the next one.
  const [result, setResult] = useState<{ userId: string; count: number } | null>(null)

  useEffect(() => {
    if (!userId) return
    let active = true
    let latest = 0
    const refresh = () => {
      const request = ++latest
      countUnreadMessages(userId).then(
        (count) => active && request === latest && setResult({ userId, count }),
        () => {}, // keep the number on screen: a badge is not worth an error
      )
    }
    refresh()
    const stop = subscribeToMessages(userId, refresh)
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
