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

/** What the inbox shows for a conversation. */
export interface ConversationSummary {
  id: string
  /** The other person. */
  otherId: string
  projectId: string | null
  projectName: string | null
  /** The other person's name, when they have written in this conversation. */
  otherName: string
  lastMessage: { body: string; fromMe: boolean; createdAt: string } | null
  lastMessageAt: string
  unread: number
}

interface ConversationRow {
  id: string
  user_a: string
  user_b: string
  project_id: string | null
  last_message_at: string
  projects: { name: string } | { name: string }[] | null
  messages: { body: string; sender_id: string; sender_name: string; created_at: string }[]
}

const LOAD_FAILED = 'No se pudieron cargar tus mensajes. Inténtalo de nuevo.'
/** Most recent conversations and messages shown; older ones stay out for now. */
const MAX_CONVERSATIONS = 50
const MAX_THREAD_MESSAGES = 200

/** The user's conversations, latest activity first, with the last message and the unread count. */
export async function listConversations(userId: string): Promise<ConversationSummary[]> {
  const [conversations, unread] = await Promise.all([
    supabase
      .from('conversations')
      .select('id, user_a, user_b, project_id, last_message_at, projects(name), messages(body, sender_id, sender_name, created_at)')
      // Admins can read every conversation: the inbox is still only the ones they take part in.
      .or(`user_a.eq.${userId},user_b.eq.${userId}`)
      .order('last_message_at', { ascending: false })
      .limit(MAX_CONVERSATIONS)
      .order('created_at', { referencedTable: 'messages', ascending: false })
      .limit(1, { referencedTable: 'messages' }),
    supabase.from(TABLE).select('conversation_id').eq('recipient_id', userId).is('read_at', null),
  ])
  if (conversations.error || unread.error) throw new Error(LOAD_FAILED)

  const unreadBy = new Map<string, number>()
  for (const row of unread.data ?? []) {
    const id = row.conversation_id as string
    unreadBy.set(id, (unreadBy.get(id) ?? 0) + 1)
  }

  return (conversations.data as unknown as ConversationRow[]).map((row) => {
    const project = Array.isArray(row.projects) ? row.projects[0] : row.projects
    const last = row.messages[0]
    const fromMe = last?.sender_id === userId
    return {
      id: row.id,
      otherId: row.user_a === userId ? row.user_b : row.user_a,
      projectId: row.project_id,
      projectName: project?.name ?? null,
      otherName: last && !fromMe ? last.sender_name : '',
      lastMessage: last ? { body: last.body, fromMe, createdAt: last.created_at } : null,
      lastMessageAt: row.last_message_at,
      unread: unreadBy.get(row.id) ?? 0,
    }
  })
}

/** A conversation's messages, oldest first (the latest ones when it is long). */
export async function listThread(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(MAX_THREAD_MESSAGES)
  if (error) throw new Error(LOAD_FAILED)
  return (data as Message[]).reverse()
}

/** Replies in an existing conversation: the database still sets the sender and the thread. */
export async function sendReply(to: { otherId: string; projectId: string | null }, body: string): Promise<Message> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ recipient_id: to.otherId, project_id: to.projectId, body: body.trim() })
    .select()
    .single()
  if (error) throw new Error(error.code === PERMISSION_DENIED ? DENIED : FAILED)
  return data as Message
}

/** Marks what the user received in this conversation as read. */
export async function markConversationRead(conversationId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('recipient_id', userId)
    .is('read_at', null)
  if (error) throw new Error(error.message)
}

/** A conversation as moderators see it: both people, no unread counts. */
export interface ModerationConversation {
  id: string
  userA: string
  userB: string
  projectId: string | null
  projectName: string | null
  lastBody: string
  lastMessageAt: string
}

/** Every conversation, latest activity first (admins only: the database refuses anyone else). */
export async function listAllConversations(): Promise<ModerationConversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, user_a, user_b, project_id, last_message_at, projects(name), messages(body, created_at)')
    .order('last_message_at', { ascending: false })
    .limit(MAX_CONVERSATIONS * 4)
    .order('created_at', { referencedTable: 'messages', ascending: false })
    .limit(1, { referencedTable: 'messages' })
  if (error) throw new Error('No se pudieron cargar las conversaciones. Inténtalo de nuevo.')
  return (data as unknown as (Omit<ConversationRow, 'messages'> & { messages: { body: string }[] })[]).map((row) => {
    const project = Array.isArray(row.projects) ? row.projects[0] : row.projects
    return {
      id: row.id,
      userA: row.user_a,
      userB: row.user_b,
      projectId: row.project_id,
      projectName: project?.name ?? null,
      lastBody: row.messages[0]?.body ?? '',
      lastMessageAt: row.last_message_at,
    }
  })
}
