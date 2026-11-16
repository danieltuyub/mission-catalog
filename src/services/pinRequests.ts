import type { PinRequest } from '../types'
import { compressImage } from './imageUtils'
import { createPin, removePinImage } from './pinService'
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

// --- Review (admins) -------------------------------------------------------------------------

/** Requests per page in the review list. */
export const REVIEW_PAGE_SIZE = 10
const REVIEW_FAILED = 'No se pudo completar la acción. Inténtalo de nuevo.'
const ALREADY_REVIEWED = 'Esta solicitud ya fue revisada.'

export type ReviewFilter = 'pending' | 'reviewed'

/** One page of everyone's requests, newest first (reviewers only: others only ever see their own). */
export async function listRequestsPage(
  filter: ReviewFilter,
  page: number,
): Promise<{ requests: PinRequest[]; total: number }> {
  const base = supabase.from(TABLE).select('*', { count: 'exact' })
  const from = (page - 1) * REVIEW_PAGE_SIZE
  const { data, error, count } = await (filter === 'pending' ? base.eq('status', 'pending') : base.neq('status', 'pending'))
    .order('created_at', { ascending: false })
    .range(from, from + REVIEW_PAGE_SIZE - 1)
  if (error) throw new Error('No se pudieron cargar las solicitudes. Inténtalo de nuevo.')
  return { requests: data as PinRequest[], total: count ?? 0 }
}

/** How many requests have been reviewed (approved or rejected). */
export async function countReviewedRequests(): Promise<number> {
  const { count, error } = await supabase
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
    .neq('status', 'pending')
  if (error) throw new Error(error.message)
  return count ?? 0
}

/** How many wait for review (the badge on the admin tab). */
export async function countPendingRequests(): Promise<number> {
  const { count, error } = await supabase
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
  if (error) throw new Error(error.message)
  return count ?? 0
}

/** Moves a pending request to `status`; false when someone else already reviewed it. */
async function setStatus(id: string, from: PinRequest['status'], to: PinRequest['status']): Promise<boolean> {
  const { data, error } = await supabase.from(TABLE).update({ status: to }).eq('id', id).eq('status', from).select('id')
  if (error) throw new Error(REVIEW_FAILED)
  return !!data && data.length > 0
}

export async function rejectRequest(id: string): Promise<void> {
  if (!(await setStatus(id, 'pending', 'rejected'))) throw new Error(ALREADY_REVIEWED)
}

/** The request's photo, copied from the private bucket to the public one. */
async function publishRequestImage(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).download(path)
  if (error || !data) throw error ?? new Error('download')
  const copy = `${crypto.randomUUID()}.webp`
  const { error: uploadError } = await supabase.storage
    .from('pin-images')
    .upload(copy, data, { contentType: data.type || 'image/webp', cacheControl: '31536000' })
  if (uploadError) throw uploadError
  return copy
}

/**
 * Publishes the pin. The request is claimed first (pending -> approved), so two admins cannot
 * publish it twice; if the pin cannot be created the request goes back to pending.
 */
export async function approveRequest(request: PinRequest): Promise<void> {
  if (!(await setStatus(request.id, 'pending', 'approved'))) throw new Error(ALREADY_REVIEWED)
  let imagePath: string | undefined
  try {
    if (request.image_path) imagePath = await publishRequestImage(request.image_path)
    await createPin({
      title: request.title,
      description: request.description,
      lat: request.lat,
      lng: request.lng,
      image_path: imagePath,
    })
  } catch {
    if (imagePath) void removePinImage(imagePath).catch(() => {})
    await setStatus(request.id, 'approved', 'pending').catch(() => {})
    throw new Error('No se pudo publicar el pin. La solicitud sigue pendiente.')
  }
}
