import type { ProjectFilters, ProjectSort, SortDirection } from './projectService'

// In-memory on purpose: survives menu navigation, resets on page reload.
let pageSize: number | null = null
let sort: ProjectSort | null = null
let direction: SortDirection | null = null
let filters: ProjectFilters | null = null
let page: number | null = null
// Return context for the detail page: only set when it was opened from the list.
let scrollY: number | null = null
let openedFromList = false

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

export function loadFilters(): ProjectFilters | null {
  return filters
}

export function saveFilters(value: ProjectFilters): void {
  filters = value
}

export function loadPage(): number | null {
  return page
}

export function savePage(value: number): void {
  page = value
}

/** Call when a project is opened from the list, so the detail's back arrow restores the list. */
export function markOpenedFromList(scroll: number): void {
  openedFromList = true
  scrollY = scroll
}

/** True if the detail was opened from the list (see clearOpenedFromList). */
export function loadOpenedFromList(): boolean {
  return openedFromList
}

export function clearOpenedFromList(): void {
  openedFromList = false
}

/** Scroll saved when leaving the list for a detail (see clearScroll). */
export function loadScroll(): number | null {
  return scrollY
}

export function clearScroll(): void {
  scrollY = null
}

/** Back to an unfiltered first page (keeps size and sort preferences). */
export function resetListContext(): void {
  filters = null
  page = null
  scrollY = null
}

export function clearProjectsView(): void {
  pageSize = null
  sort = null
  direction = null
  filters = null
  page = null
  scrollY = null
  openedFromList = false
}
