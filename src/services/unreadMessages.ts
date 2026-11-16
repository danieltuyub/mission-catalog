import { supabase } from './supabaseClient'

const TABLE = 'messages'

/** Messages sent to the user that they have not read yet. */
export async function countUnreadMessages(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .is('read_at', null)
  if (error) throw new Error(error.message)
  return count ?? 0
}

/**
 * Calls `onChange` whenever a message to the user arrives or is updated (e.g. read).
 * Realtime only delivers rows the user may read. Returns the function that stops listening.
 */
export function subscribeToMessages(userId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`messages-for-${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE, filter: `recipient_id=eq.${userId}` }, onChange)
    .subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}
