import { useSyncExternalStore } from 'react'

export const ROUTES = ['mapa', 'proyectos', 'contacto', 'login', 'cuenta', 'admin'] as const
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

/**
 * True on pages that only make sense signed in: the account and admin areas and the project forms.
 * Reads the current hash (not a hook): used at the moment of signing out.
 */
export function isPrivateRoute(): boolean {
  const [name, id, action] = segments()
  return name === 'cuenta' || name === 'admin' || (name === 'proyectos' && (id === NEW_PROJECT || action === EDIT))
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

/** Sections of the account area, `#/cuenta/<section>`. */
export const ACCOUNT_SECTIONS = ['mensajes', 'solicitudes', 'proyectos', 'perfil'] as const
export type AccountSection = (typeof ACCOUNT_SECTIONS)[number]

/** Section of `#/cuenta/<section>`; null on `#/cuenta`, on an unknown section or on any other route. */
export function useAccountSection(): AccountSection | null {
  return useSyncExternalStore(subscribe, () => {
    const [name, section] = segments()
    return name === 'cuenta' ? (ACCOUNT_SECTIONS.find((s) => s === section) ?? null) : null
  })
}

/** Lists inside the account's Proyectos section, `#/cuenta/proyectos/<tab>`. */
export const PROJECT_TABS = ['creados', 'guardados'] as const
export type ProjectTab = (typeof PROJECT_TABS)[number]

/** Tab of `#/cuenta/proyectos/<tab>`; null when absent or unknown (the section then picks its default). */
export function useProjectTab(): ProjectTab | null {
  return useSyncExternalStore(subscribe, () => {
    const [name, section, tab] = segments()
    return name === 'cuenta' && section === 'proyectos' ? (PROJECT_TABS.find((t) => t === tab) ?? null) : null
  })
}

/** `#/cuenta/mensajes/<id>` -> the open conversation's id; null otherwise. */
export function useConversationId(): string | null {
  return useSyncExternalStore(subscribe, () => {
    const [name, section, id] = segments()
    if (name !== 'cuenta' || section !== 'mensajes' || !id) return null
    try {
      return decodeURIComponent(id)
    } catch {
      return id
    }
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
