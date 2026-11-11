import { useCallback, useEffect, useState } from 'react'
import { createPin, getPins, type NewPin } from '../services/pinService'
import type { Pin } from '../types'

export function usePins() {
  const [pins, setPins] = useState<Pin[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getPins()
      .then((data) => !cancelled && setPins(data))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load pins'))
    return () => {
      cancelled = true
    }
  }, [])

  const addPin = useCallback(async (input: NewPin) => {
    const pin = await createPin(input)
    setPins((prev) => [pin, ...prev])
    return pin
  }, [])

  return { pins, error, addPin }
}
