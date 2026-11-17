import { supabase } from './supabaseClient'

const TABLE = 'pin_contacts'

/** Who answers for each pin, by pin id (admins only: the table is private). */
export async function listPinContacts(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from(TABLE).select('pin_id, user_id')
  if (error) throw new Error('No se pudieron cargar los contactos')
  return new Map((data as { pin_id: string; user_id: string }[]).map((r) => [r.pin_id, r.user_id]))
}

/** Sets who answers for the pin; null removes it. */
export async function setPinContact(pinId: string, userId: string | null): Promise<void> {
  const { error} = userId
    ? await supabase.from(TABLE).upsert({ pin_id: pinId, user_id: userId }, { onConflict: 'pin_id' })
    : await supabase.from(TABLE).delete().eq('pin_id', pinId)
  if (error) throw new Error('No se pudo guardar el contacto')
}
