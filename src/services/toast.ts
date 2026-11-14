export interface ToastAction {
  label: string
  onClick: () => void
}

export interface Toast {
  /** Changes with every toast, so a replacement restarts the timers. */
  id: number
  message: string
  action?: ToastAction
}

// One toast at a time: a new one replaces the current one.
let current: Toast | null = null
let nextId = 1
const listeners = new Set<() => void>()

const emit = () => listeners.forEach((listener) => listener())

export function showToast(message: string, action?: ToastAction): void {
  current = { id: nextId++, message, action }
  emit()
}

/** Without an id it closes whatever is showing; with one, only that toast (a newer one stays). */
export function dismissToast(id?: number): void {
  if (!current || (id !== undefined && current.id !== id)) return
  current = null
  emit()
}

export const getToast = () => current

export function subscribeToast(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
