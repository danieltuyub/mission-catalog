import type { PinRequest } from '../types'
import { compressImage } from './imageUtils'
import { supabase } from './supabaseClient'

const TABLE = 'pin_requests'
const BUCKET = 'pin-request-images'
/** The database enforces the same limit. */
export const MAX_PENDING_REQUESTS = 5

const FAILED = 'No se pudo enviar la solicitud. Inténtalo de nuevo.'
const LIMIT = `Ya tienes ${MAX_PENDING_REQUESTS} solicitudes pendientes. Espera a que se revisen para enviar otra.`
const DENIED = 'Tu cuenta no puede solicitar pines o ya alcanzaste el límite de solicitudes pendientes.'
const PERMISSION_DENIED = '42501'

export interface NewPinRequest {
  title: string
  description: string
  lat: number
  lng: number
}

/** Uploads under the user's own folder, as the bucket policy requires. */
async function uploadRequestImage(userId: string, file: File): Promise<string> {
  const blob = await compressImage(file)
  const path = `${userId}/${crypto.randomUUID()}.webp`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: 'image/webp',
    cacheControl: '31536000',
  })
  if (error) throw error
  return path
}

/**
 * Files a pin request as pending (the database sets who and the status).
 * Errors carry a message ready to show.
 */
export async function requestPin(userId: string, input: NewPinRequest, image?: File): Promise<PinRequest> {
  const { count, error: countError } = await supabase
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('requested_by', userId)
    .eq('status', 'pending')
  if (countError) throw new Error(FAILED)
  if ((count ?? 0) >= MAX_PENDING_REQUESTS) throw new Error(LIMIT)

  let image_path: string | undefined
  if (image) {
    try {
      image_path = await uploadRequestImage(userId, image)
    } catch {
      throw new Error('No se pudo subir la imagen. Inténtalo de nuevo.')
    }
  }

  // An undefined image_path is left out of the request body.
  const row: NewPinRequest & { image_path?: string } = { ...input, image_path }
  const { data, error } = await supabase.from(TABLE).insert(row).select().single()

  if (error) {
    // Don't leave an orphan file behind.
    if (image_path) void supabase.storage.from(BUCKET).remove([image_path]).catch(() => {})
    throw new Error(error.code === PERMISSION_DENIED ? DENIED : FAILED)
  }
  return data as PinRequest
}

/** The user's own requests, newest first (admins would otherwise see everyone's). */
export async function listMyRequests(userId: string): Promise<PinRequest[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('requested_by', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error('No se pudieron cargar tus solicitudes. Inténtalo de nuevo.')
  return data as PinRequest[]
}

/** The bucket is private: a link that works for an hour. */
export async function requestImageUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
  if (error || !data) throw new Error('No se pudo cargar la imagen')
  return data.signedUrl
}
