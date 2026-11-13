import { useSyncExternalStore } from 'react'

export const ROUTES = ['mapa', 'proyectos', 'contacto', 'login'] as const
export type Route = (typeof ROUTES)[number]

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

// Ignore a `?query` (e.g. `#/login?next=...`) when matching routes.
const segments = () => window.location.hash.replace(/^#\/?/, '').split('?')[0].split('/')

function getRouteSnapshot(): Route {
  const [name] = segments()
  return ROUTES.find((r) => r === name) ?? 'mapa'
}

/** Segment of `#/proyectos/<id>/editar` (the edit form). */
const EDIT = 'editar'

/** Segment of `#/proyectos/nuevo` (the create form). */
const NEW_PROJECT = 'nuevo'

function getProjectIdSnapshot(): string | null {
  const [name, id, action] = segments()
  if (name !== 'proyectos' || !id || id === NEW_PROJECT || action === EDIT) return null
  try {
    return decodeURIComponent(id)
  } catch {
    return id
  }
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, getRouteSnapshot)
}

/** `#/proyectos/<id>` -> id; null on any other route. */
export function useProjectId(): string | null {
  return useSyncExternalStore(subscribe, getProjectIdSnapshot)
}

/** True on `#/proyectos/nuevo`. */
export function useIsNewProject(): boolean {
  return useSyncExternalStore(subscribe, () => {
    const [name, id] = segments()
    return name === 'proyectos' && id === NEW_PROJECT
  })
}

/** `#/proyectos/<id>/editar` -> id; null on any other route. */
export function useEditProjectId(): string | null {
  return useSyncExternalStore(subscribe, () => {
    const [name, id, action] = segments()
    if (name !== 'proyectos' || !id || action !== EDIT) return null
    try {
      return decodeURIComponent(id)
    } catch {
      return id
    }
  })
}
