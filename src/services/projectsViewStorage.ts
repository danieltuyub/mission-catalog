import type { ProjectSort, SortDirection } from './projectService'

// In-memory on purpose: survives menu navigation, resets on page reload.
let pageSize: number | null = null
let sort: ProjectSort | null = null
let direction: SortDirection | null = null

export function loadPageSize(): number | null {
  return pageSize
}

export function savePageSize(size: number): void {
  pageSize = size
}

export function loadSort(): ProjectSort | null {
  return sort
}

export function saveSort(value: ProjectSort): void {
  sort = value
}

export function loadDirection(): SortDirection | null {
  return direction
}

export function saveDirection(value: SortDirection): void {
  direction = value
}

export function clearProjectsView(): void {
  pageSize = null
  sort = null
  direction = null
}
