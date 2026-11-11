export type ProjectStatus = 'open' | 'closed' | 'paused'

export interface Project {
  id: string
  name: string
  responsible: string | null
  description: string | null
  /** ISO date (YYYY-MM-DD) */
  started_at: string | null
  country: string | null
  region: string | null
  phone: string | null
  mail: string | null
  status: ProjectStatus
  created_at: string
  updated_at: string
}
