import i18n from '../i18n'

/** Where a project page was opened from, so it can lead back there: the public list or a list in "Mi espacio". */
export type EditOrigin = 'lista' | 'creados' | 'guardados' | 'admin'

const ORIGINS: readonly EditOrigin[] = ['lista', 'creados', 'guardados', 'admin']

/** Where "back" goes, and the translation key of what the button says (`project` namespace). */
const BACK = {
  lista: { href: '#/proyectos', key: 'backList' },
  creados: { href: '#/cuenta/proyectos/creados', key: 'backCreated' },
  guardados: { href: '#/cuenta/proyectos/guardados', key: 'backSaved' },
  admin: { href: '#/admin/proyectos', key: 'backAdmin' },
} as const satisfies Record<EditOrigin, { href: string; key: string }>

/** The link back and its text, in the current language. */
export const originBack = (origin: EditOrigin) => ({ href: BACK[origin].href, label: i18n.t(`project:${BACK[origin].key}`) })

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

/** The admin's project list with the new-project form open over it. */
export const ADMIN_NEW_PROJECT_URL = '#/admin/proyectos?nuevo'
