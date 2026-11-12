import { useEffect, useState } from 'react'

/** True only after `active` has stayed true for `ms`; false as soon as it turns false. */
export function useDelayed(active: boolean, ms: number): boolean {
  const [elapsed, setElapsed] = useState(false)

  useEffect(() => {
    if (!active) return
    const timer = window.setTimeout(() => setElapsed(true), ms)
    return () => {
      window.clearTimeout(timer)
      setElapsed(false)
    }
  }, [active, ms])

  return active && elapsed
}
