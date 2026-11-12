import type { Project, ProjectStatus } from '../types'
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

/** Within a field the values are OR-ed; across fields they are AND-ed. Empty = no filter. */
export interface ProjectFilters {
  status: ProjectStatus[]
  country: string[]
  region: string[]
  responsible: string[]
}

export const EMPTY_FILTERS: ProjectFilters = { status: [], country: [], region: [], responsible: [] }

export interface FilterOptions {
  country: string[]
  region: string[]
  responsible: string[]
}

export interface ProjectsPage {
  data: Project[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface GetProjectsOptions {
  page?: number
  pageSize?: number
  sort?: ProjectSort
  direction?: SortDirection
  filters?: Partial<ProjectFilters>
}

export async function getProjects({
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  sort = DEFAULT_SORT,
  direction = DEFAULT_DIRECTION[sort],
  filters = {},
}: GetProjectsOptions = {}): Promise<ProjectsPage> {
  const safePage = Math.max(1, Math.floor(page))
  const safeSize = Math.max(1, Math.floor(pageSize))
  const from = (safePage - 1) * safeSize

  // Filters must be applied before order/range (PostgREST builder types).
  let query = supabase.from(TABLE).select('*', { count: 'exact' })
  for (const column of ['status', 'country', 'region', 'responsible'] as const) {
    const values = filters[column]
    if (values && values.length > 0) query = query.in(column, values)
  }

  const { data, error, count } = await query
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

const byAlphabet = (a: string, b: string) => a.localeCompare(b, 'es', { sensitivity: 'base' })

// Options do not depend on page, sort or filters: fetch once per session.
let optionsRequest: Promise<FilterOptions> | null = null

export function getProjectFilterOptions(): Promise<FilterOptions> {
  optionsRequest ??= (async () => {
    const { data, error } = await supabase.rpc('project_filter_options')
    if (error) throw error
    const raw = (data ?? {}) as Partial<Record<keyof FilterOptions, string[]>>
    return {
      country: [...(raw.country ?? [])].sort(byAlphabet),
      region: [...(raw.region ?? [])].sort(byAlphabet),
      responsible: [...(raw.responsible ?? [])].sort(byAlphabet),
    }
  })().catch((e: unknown) => {
    optionsRequest = null // allow retry after a failure
    throw e
  })
  return optionsRequest
}

export function clearFilterOptionsCache(): void {
  optionsRequest = null
}
