import type { Message } from '../types'
import { supabase } from './supabaseClient'

const TABLE = 'messages'
/** The database enforces the same limit. */
export const MAX_MESSAGE_LENGTH = 2000

const FAILED = 'No se pudo enviar el mensaje. Inténtalo de nuevo.'
const NO_CONTACT = 'Este proyecto aún no tiene un contacto asignado.'
const DENIED = 'Tu cuenta no puede enviar mensajes a este contacto.'
const PERMISSION_DENIED = '42501'
const NOT_NULL_VIOLATION = '23502'

/**
 * Writes to whoever created the project: the database picks the recipient, the sender
 * and the sender's name, so the client only sends the project and the text.
 * Errors carry a message ready to show.
 */
export async function sendProjectMessage(projectId: string, body: string): Promise<Message> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ project_id: projectId, body: body.trim() })
    .select()
    .single()

  if (error) {
    if (error.code === NOT_NULL_VIOLATION) throw new Error(NO_CONTACT)
    throw new Error(error.code === PERMISSION_DENIED ? DENIED : FAILED)
  }
  return data as Message
}
