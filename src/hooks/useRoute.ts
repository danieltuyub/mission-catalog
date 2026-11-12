import { useSyncExternalStore } from 'react'

export const ROUTES = ['mapa', 'proyectos', 'contacto'] as const
export type Route = (typeof ROUTES)[number]

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

const segments = () => window.location.hash.replace(/^#\/?/, '').split('/')

function getRouteSnapshot(): Route {
  const [name] = segments()
  return ROUTES.find((r) => r === name) ?? 'mapa'
}

function getProjectIdSnapshot(): string | null {
  const [name, id] = segments()
  if (name !== 'proyectos' || !id) return null
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
