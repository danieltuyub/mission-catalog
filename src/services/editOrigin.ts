/** Where a project page was opened from, so it can lead back there: the public list or a list in "Mi espacio". */
export type EditOrigin = 'lista' | 'creados' | 'guardados' | 'admin'

const ORIGINS: readonly EditOrigin[] = ['lista', 'creados', 'guardados', 'admin']

/** Where "back" goes, and what the button says. */
const BACK: Record<EditOrigin, { href: string; label: string }> = {
  lista: { href: '#/proyectos', label: 'Proyectos' },
  creados: { href: '#/cuenta/proyectos/creados', label: 'Creados por mí' },
  guardados: { href: '#/cuenta/proyectos/guardados', label: 'Guardados' },
  admin: { href: '#/admin/proyectos', label: 'Administración' },
}

export const originBack = (origin: EditOrigin) => BACK[origin]

const withOrigin = (path: string, from?: EditOrigin) => `${path}${from ? `?from=${from}` : ''}`

/** `#/proyectos/<id>`, with `?from=<origin>` when opened from a list. */
export function projectUrl(id: string, from?: EditOrigin): string {
  return withOrigin(`#/proyectos/${id}`, from)
}

/** `#/proyectos/<id>/editar`, with `?from=<origin>` when opened from a list. */
export function editUrl(id: string, from?: EditOrigin): string {
  return withOrigin(`#/proyectos/${id}/editar`, from)
}

/** The `from` param of the current URL; anything but a known value is ignored. */
export function readEditOrigin(hash: string = window.location.hash): EditOrigin | null {
  const from = new URLSearchParams(hash.split('?')[1] ?? '').get('from')
  return ORIGINS.find((o) => o === from) ?? null
}

/** The admin's project list with the edit form open over it (the list is not reloaded). */
export const adminEditUrl = (id: string) => `#/admin/proyectos?editar=${encodeURIComponent(id)}`

/** The admin's project list, no form. */
export const ADMIN_PROJECTS_URL = '#/admin/proyectos'
