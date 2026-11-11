import type { Pin } from '../types'
import { supabase } from './supabaseClient'

export type NewPin = Pick<Pin, 'title' | 'lat' | 'lng'> &
  Partial<Pick<Pin, 'description'>>

const TABLE = 'pins'

export async function getPins(): Promise<Pin[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Pin[]
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
