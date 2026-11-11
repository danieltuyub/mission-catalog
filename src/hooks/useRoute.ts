import { useSyncExternalStore } from 'react'

export const ROUTES = ['mapa', 'proyectos', 'contacto'] as const
export type Route = (typeof ROUTES)[number]

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

function getSnapshot(): Route {
  const name = window.location.hash.replace(/^#\/?/, '')
  return ROUTES.find((r) => r === name) ?? 'mapa'
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, getSnapshot)
}
