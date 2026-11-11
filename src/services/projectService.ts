import type { Project } from '../types'
import { supabase } from './supabaseClient'

const TABLE = 'projects'

export const DEFAULT_PAGE_SIZE = 3

export type ProjectSort = 'name' | 'created_at'
export type SortDirection = 'asc' | 'desc'
export const DEFAULT_SORT: ProjectSort = 'name'

// Natural direction per field: name A→Z, created_at newest first.
export const DEFAULT_DIRECTION: Record<ProjectSort, SortDirection> = {
  name: 'asc',
  created_at: 'desc',
}

export interface ProjectsPage {
  data: Project[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export async function getProjects(
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  sort: ProjectSort = DEFAULT_SORT,
  direction: SortDirection = DEFAULT_DIRECTION[sort],
): Promise<ProjectsPage> {
  const safePage = Math.max(1, Math.floor(page))
  const safeSize = Math.max(1, Math.floor(pageSize))
  const from = (safePage - 1) * safeSize

  const { data, error, count } = await supabase
    .from(TABLE)
    .select('*', { count: 'exact' })
    .order(sort, { ascending: direction === 'asc' })
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
