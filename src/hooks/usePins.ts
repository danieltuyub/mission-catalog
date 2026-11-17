import { useCallback, useEffect, useState } from 'react'
import { updatePinWithImage } from '../services/pinEdit'
import { createPin, getPins, removePinImage, uploadPinImage, type NewPin, type PinPatch } from '../services/pinService'
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

  const editPin = useCallback(async (pin: Pin, patch: PinPatch, image?: File, removeImage = false) => {
    const updated = await updatePinWithImage(pin, patch, image, removeImage)
    setPins((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    return updated
  }, [])

  return { pins, error, addPin, editPin }
}
