export type ProjectStatus = 'open' | 'closed' | 'paused'

export interface ProjectImage {
  id: string
  /** Path inside the `project-images` bucket. */
  path: string
  position: number
  alt: string | null
}

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
  /** Long text for the detail page. Only loaded by the detail query, not the list. */
  details?: string | null
  /** Present when the query embeds `project_images`. */
  project_images?: ProjectImage[]
}
