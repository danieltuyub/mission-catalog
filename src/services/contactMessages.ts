import { currentLanguage, tError } from '../i18n'
import { supabase } from './supabaseClient'

const TABLE = 'contact_messages'

export const MAX_CONTACT_NAME = 120
export const MAX_CONTACT_VALUE = 200
/** The database enforces the same limit. */
export const MAX_CONTACT_BODY = 2000

export interface ContactMessage {
  id: string
  name: string
  contact: string
  body: string
  language: string | null
  createdAt: string
  readAt: string | null
}

interface Row {
  id: string
  name: string
  contact: string
  body: string
  language: string | null
  created_at: string
  read_at: string | null
}

const toMessage = (r: Row): ContactMessage => ({
  id: r.id,
  name: r.name,
  contact: r.contact,
  body: r.body,
  language: r.language,
  createdAt: r.created_at,
  readAt: r.read_at,
})

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE = /^\+?[\d\s().-]{7,20}$/

/** An email address or a phone number (7 to 15 digits, with the usual separators). */
export function isValidContact(value: string): boolean {
  const v = value.trim()
  if (v.length > MAX_CONTACT_VALUE) return false
  if (EMAIL.test(v)) return true
  return PHONE.test(v) && v.replace(/\D/g, '').length >= 7 && v.replace(/\D/g, '').length <= 15
}

const RATE_LIMITED = 'rate_limited'

/** Sends the public form. Errors carry a message ready to show. */
export async function sendContactMessage(input: { name: string; contact: string; body: string }): Promise<void> {
  const { error } = await supabase.from(TABLE).insert({
    name: input.name.trim(),
    contact: input.contact.trim(),
    body: input.body.trim(),
    language: currentLanguage(),
  })
  if (error) throw new Error(error.message === RATE_LIMITED ? tError('contactRateLimited') : tError('contactFailed'))
}

/** Admins: every message, newest first. */
export async function listContactMessages(): Promise<ContactMessage[]> {
  const { data, error } = await supabase.from(TABLE).select('*').order('created_at', { ascending: false }).limit(200)
  if (error) throw new Error(tError('loadContact'))
  return (data as Row[]).map(toMessage)
}

/** Admins: marks one read (or unread, with `false`). */
export async function setContactRead(id: string, read: boolean): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ read_at: read ? new Date().toISOString() : null })
    .eq('id', id)
  if (error) throw new Error(tError('contactUpdateFailed'))
}

/** Admins: how many have not been read. */
export async function countUnreadContacts(): Promise<number> {
  const { count, error } = await supabase.from(TABLE).select('id', { count: 'exact', head: true }).is('read_at', null)
  if (error) throw new Error(error.message)
  return count ?? 0
}

let subscriptions = 0

/** Calls `onChange` when a contact message arrives or changes. Realtime only delivers rows the user may read. */
export function subscribeToContacts(onChange: () => void): () => void {
  const channel = supabase
    .channel(`contact-messages-${++subscriptions}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, onChange)
    .subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}
