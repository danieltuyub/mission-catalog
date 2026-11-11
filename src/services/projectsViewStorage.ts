// In-memory on purpose: survives menu navigation, resets on page reload.
let pageSize: number | null = null

export function loadPageSize(): number | null {
  return pageSize
}

export function savePageSize(size: number): void {
  pageSize = size
}

export function clearPageSize(): void {
  pageSize = null
}
