import type { ProjectFilters } from './projectService'

export function countActiveFilters(f: ProjectFilters): number {
  return f.status.length + f.country.length + f.region.length + f.responsible.length + (f.mine ? 1 : 0)
}
