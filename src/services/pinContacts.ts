import { tError } from '../i18n'
import { supabase } from './supabaseClient'

const TABLE = 'pin_contacts'

/** Who answers for each pin, by pin id (admins only: the table is private). */
export async function listPinContacts(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from(TABLE).select('pin_id, user_id')
  if (error) throw new Error(tError('loadContacts'))
  return new Map((data as { pin_id: string; user_id: string }[]).map((r) => [r.pin_id, r.user_id]))
}

/** Sets who answers for the pin; null removes it. */
export async function setPinContact(pinId: string, userId: string | null): Promise<void> {
  const { error} = userId
    ? await supabase.from(TABLE).upsert({ pin_id: pinId, user_id: userId }, { onConflict: 'pin_id' })
    : await supabase.from(TABLE).delete().eq('pin_id', pinId)
  if (error) throw new Error(tError('saveContact'))
}

/** Whether a pin has someone to write to: `self` is the signed-in contact (the database never says who). */
export type PinContactState = 'none' | 'self' | 'other'

export async function getPinContactState(pinId: string): Promise<PinContactState> {
  const { data, error } = await supabase.rpc('pin_contact_state', { p_pin: pinId })
  if (error) throw new Error(tError('readContact'))
  return data === 'self' || data === 'other' ? data : 'none'
}
