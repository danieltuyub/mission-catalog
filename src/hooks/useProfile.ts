import { tError } from '../i18n'
import { useEffect, useState } from 'react'
import { getProfile, type Profile } from '../services/accountService'

interface Result {
  userId: string
  profile: Profile | null
  error: string | null
}

export function useProfile(userId: string) {
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    let cancelled = false
    getProfile(userId)
      .then((profile) => !cancelled && setResult({ userId, profile, error: null }))
      .catch(
        (e: unknown) =>
          !cancelled &&
          setResult({ userId, profile: null, error: e instanceof Error ? e.message : tError('loadProfile') }),
      )
    return () => {
      cancelled = true
    }
  }, [userId])

  const current = result?.userId === userId ? result : null
  return { profile: current?.profile ?? null, error: current?.error ?? null, loading: current === null }
}
