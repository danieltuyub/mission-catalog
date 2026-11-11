import type { Project } from '../types'
import { supabase } from './supabaseClient'

const TABLE = 'projects'

export const DEFAULT_PAGE_SIZE = 4

export interface ProjectsPage {
  data: Project[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export async function getProjects(page = 1, pageSize = DEFAULT_PAGE_SIZE): Promise<ProjectsPage> {
  const safePage = Math.max(1, Math.floor(page))
  const safeSize = Math.max(1, Math.floor(pageSize))
  const from = (safePage - 1) * safeSize

  const { data, error, count } = await supabase
    .from(TABLE)
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .order('id')
    .range(from, from + safeSize - 1)

  if (error) throw error

  const total = count ?? 0
  return {
    data: data as Project[],
    total,
    page: safePage,
    pageSize: safeSize,
    totalPages: Math.ceil(total / safeSize),
  }
}
