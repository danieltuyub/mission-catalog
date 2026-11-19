import { tError } from '../i18n'
import type { LatLngTuple } from 'leaflet'
import { supabase } from './supabaseClient'

/** The exact place of every pin, by id (admins only: the database refuses anyone else). */
export async function listPinLocations(): Promise<Map<string, LatLngTuple>> {
  const { data, error } = await supabase.rpc('admin_pin_locations')
  if (error) throw new Error(tError('loadLocations'))
  return new Map((data as { pin_id: string; lat: number; lng: number }[]).map((r) => [r.pin_id, [r.lat, r.lng]]))
}
