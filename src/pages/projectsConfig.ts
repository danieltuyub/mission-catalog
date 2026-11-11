export const PAGE_SIZE_OPTIONS = [3, 6, 12] as const

/** Card slots always reserved in the list (sm and up), even when a page has fewer projects. */
export const DEFAULT_MIN_SLOTS = 3

// Must match ProjectCard's `sm:h-56` (14rem) and the list's `space-y-5` (1.25rem).
export const CARD_HEIGHT_REM = 14
export const CARD_GAP_REM = 1.25

export const SORT_OPTIONS = [
  { value: 'name', label: 'Nombre' },
  { value: 'created_at', label: 'Fecha' },
] as const
