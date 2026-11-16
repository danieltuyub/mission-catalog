import type { ToastAction } from './toast'

const DEFAULT_NEXT = '/proyectos'

/** Login URL that returns to `path` (a hash path like `/proyectos/nuevo`) after signing in. */
export function loginUrl(path: string): string {
  return `#/login?next=${encodeURIComponent(path)}`
}

/** Toast button that takes a signed-out visitor to the login and back to the page they are on. */
export function loginToastAction(): ToastAction {
  return {
    label: 'Iniciar sesión',
    onClick: () => {
      window.location.hash = loginUrl(window.location.hash.replace(/^#/, '') || '/')
    },
  }
}

/** Where to go after signing in: the `next` param if it is a safe in-app path. */
export function readNext(hash: string = window.location.hash): string {
  const query = hash.split('?')[1] ?? ''
  const next = new URLSearchParams(query).get('next')
  // In-app absolute paths only: no `//host`, no backslashes, no other schemes.
  if (!next || !/^\/(?![/\\])/.test(next)) return DEFAULT_NEXT
  return next
}
