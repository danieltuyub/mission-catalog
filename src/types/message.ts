/** A chat message between an interested person and a creator (see the `messages` table). */
export interface Message {
  id: string
  sender_id: string
  recipient_id: string
  /** The project it was written from, if any. */
  project_id: string | null
  /** Sender's name when it was sent (the database fills it in). */
  sender_name: string
  body: string
  created_at: string
  read_at: string | null
}
