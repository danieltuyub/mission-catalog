/** A chat message between an interested person and a creator (see the `messages` table). */
export interface Message {
  id: string
  /** The thread it belongs to (the database assigns it). */
  conversation_id: string
  sender_id: string
  recipient_id: string
  /** The project it was written from, if any. */
  project_id: string | null
  /** The pin it was written from, if any. */
  pin_id: string | null
  /** Sender's name when it was sent (the database fills it in). */
  sender_name: string
  body: string
  created_at: string
  read_at: string | null
}

/** "These two people, about this project": what the inbox lists. Written by the database only. */
export interface Conversation {
  id: string
  /** The two people, stored in a fixed order (`user_a` < `user_b`). */
  user_a: string
  user_b: string
  /** Null for a direct conversation, or when the project was deleted. */
  project_id: string | null
  /** Null unless it is about a pin (and the pin still exists). */
  pin_id: string | null
  created_at: string
  /** Latest activity: what the inbox sorts by. */
  last_message_at: string
}
