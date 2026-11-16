import { useCallback, useEffect, useState } from 'react'
import { listConversations, type ConversationSummary } from '../services/messages'
import { subscribeToMessages } from '../services/unreadMessages'

interface Result {
  userId: string
  conversations: ConversationSummary[] | null
  error: string | null
}

/** The signed-in user's conversations, refreshed when a message to them arrives. */
export function useConversations(userId: string | null) {
  const [result, setResult] = useState<Result | null>(null)
  const [version, setVersion] = useState(0)
  const reload = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    listConversations(userId).then(
      (conversations) => !cancelled && setResult({ userId, conversations, error: null }),
      (e: unknown) => !cancelled && setResult({ userId, conversations: null, error: e instanceof Error ? e.message : 'Error' }),
    )
    return () => {
      cancelled = true
    }
  }, [userId, version])

  useEffect(() => (userId ? subscribeToMessages(userId, reload) : undefined), [userId, reload])

  const current = result?.userId === userId ? result : null
  return {
    conversations: current?.conversations ?? [],
    error: current?.error ?? null,
    /** True until the first answer (a reload keeps showing the previous list). */
    loading: current === null,
    reload,
  }
}
