export const PAGE_WINDOW = 3

/** Up to 3 consecutive pages: first 3 at the start, last 3 at the end, else previous/current/next. */
export function getPageWindow(page: number, totalPages: number): number[] {
  if (totalPages <= 0) return []
  const size = Math.min(PAGE_WINDOW, totalPages)
  const start = Math.min(Math.max(page - 1, 1), totalPages - size + 1)
  return Array.from({ length: size }, (_, i) => start + i)
}
