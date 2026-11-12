import { useCallback, useEffect, useState } from 'react'
import { createPin, getPins, removePinImage, updatePin, uploadPinImage, type NewPin } from '../services/pinService'
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

  const addPin = useCallback(async (input: NewPin, image?: File) => {
    const image_path = image ? await uploadPinImage(image) : undefined
    try {
      const pin = await createPin(image_path ? { ...input, image_path } : input)
      setPins((prev) => [pin, ...prev])
      return pin
    } catch (e) {
      // Don't leave an orphan file behind.
      if (image_path) void removePinImage(image_path).catch(() => {})
      throw e
    }
  }, [])

  const editPin = useCallback(
    async (pin: Pin, patch: { title: string; description: string }, image?: File, removeImage = false) => {
      const uploaded = image ? await uploadPinImage(image) : undefined
      const image_path = uploaded ?? (removeImage ? null : undefined)
      try {
        const updated = await updatePin(pin.id, image_path === undefined ? patch : { ...patch, image_path })
        setPins((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
        // Only now is it safe to drop the previous file.
        if (image_path !== undefined && pin.image_path) void removePinImage(pin.image_path).catch(() => {})
        return updated
      } catch (e) {
        if (uploaded) void removePinImage(uploaded).catch(() => {})
        throw e
      }
    },
    [],
  )

  return { pins, error, addPin, editPin }
}
