export const PAGE_SIZE_OPTIONS = [4, 8, 12] as const

/** Card slots always reserved in the list (sm and up), even when a page has fewer projects. */
export const DEFAULT_MIN_SLOTS = 4

// Must match ProjectCard's `sm:h-56` (14rem) and the list's `space-y-5` (1.25rem).
export const CARD_HEIGHT_REM = 14
export const CARD_GAP_REM = 1.25

export const SORT_OPTIONS = [
  { value: 'name', label: 'Nombre' },
  { value: 'created_at', label: 'Fecha' },
] as const

/** Wait before querying after a filter checkbox changes. */
export const FILTER_DEBOUNCE_MS = 300

/** Show a search box in a filter group when it has more options than this. */
export const FILTER_SEARCH_THRESHOLD = 8

/** Loading placeholders appear only after this long, so fast loads do not flash a skeleton. */
export const SKELETON_DELAY_MS = 200
