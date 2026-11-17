import type { Pin } from '../types'
import { compressImage } from './imageUtils'
import { supabase } from './supabaseClient'

export type NewPin = Pick<Pin, 'title' | 'lat' | 'lng'> &
  Partial<Pick<Pin, 'description' | 'image_path' | 'country' | 'region' | 'city'>>

const TABLE = 'pins'
const BUCKET = 'pin-images'

/** Compress and upload an image; returns its storage path. */
export async function uploadPinImage(file: File): Promise<string> {
  const blob = await compressImage(file)
  const path = `${crypto.randomUUID()}.webp`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: 'image/webp',
    cacheControl: '31536000',
  })
  if (error) throw error
  return path
}

export async function removePinImage(path: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([path])
}

export function pinImageUrl(path: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

export async function getPins(): Promise<Pin[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Pin[]
}

export type PinPatch = Partial<Pick<Pin, 'title' | 'description' | 'image_path' | 'country' | 'region' | 'city'>>

export async function updatePin(id: string, patch: PinPatch): Promise<Pin> {
  const { data, error } = await supabase.from(TABLE).update(patch).eq('id', id).select().single()
  if (error) throw error
  return data as Pin
}

export async function createPin(pin: NewPin): Promise<Pin> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(pin)
    .select()
    .single()

  if (error) throw error
  return data as Pin
}

/** Removes the pin and, when it has one, its photo. */
export async function deletePin(pin: Pick<Pin, 'id' | 'image_path'>): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', pin.id)
  if (error) throw error
  if (pin.image_path) void removePinImage(pin.image_path).catch(() => {})
}
