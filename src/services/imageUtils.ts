export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_SIDE = 1600
const QUALITY = 0.8

export function validateImage(file: File): string | null {
  if (!file.type.startsWith('image/')) return 'El archivo debe ser una imagen'
  if (file.size > MAX_IMAGE_BYTES) return 'La imagen pesa más de 10 MB'
  return null
}

/** Downscale to MAX_SIDE and re-encode as WebP. */
export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', QUALITY))
  if (!blob) throw new Error('No se pudo procesar la imagen')
  return blob
}
