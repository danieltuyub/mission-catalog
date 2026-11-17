import type { Pin } from '../types'
import { removePinImage, updatePin, uploadPinImage, type PinPatch } from './pinService'

/**
 * Saves a pin's changes, replacing or removing its photo. The old file goes only once the update succeeded;
 * a file uploaded for a failed update is removed.
 */
export async function updatePinWithImage(pin: Pin, patch: PinPatch, image?: File, removeImage = false): Promise<Pin> {
  const uploaded = image ? await uploadPinImage(image) : undefined
  const image_path = uploaded ?? (removeImage ? null : undefined)
  try {
    const updated = await updatePin(pin.id, image_path === undefined ? patch : { ...patch, image_path })
    if (image_path !== undefined && pin.image_path) void removePinImage(pin.image_path).catch(() => {})
    return updated
  } catch (e) {
    if (uploaded) void removePinImage(uploaded).catch(() => {})
    throw e
  }
}
