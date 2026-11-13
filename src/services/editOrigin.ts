/** Where the edit page was opened from; only the project list is tracked. */
export type EditOrigin = 'lista'

const FROM_LIST: EditOrigin = 'lista'

/** `#/proyectos/<id>/editar`, with `?from=lista` when opened from the list. */
export function editUrl(id: string, from?: EditOrigin): string {
  return `#/proyectos/${id}/editar${from ? `?from=${from}` : ''}`
}

/** The `from` param of the current URL; anything but a known value is ignored. */
export function readEditOrigin(hash: string = window.location.hash): EditOrigin | null {
  const from = new URLSearchParams(hash.split('?')[1] ?? '').get('from')
  return from === FROM_LIST ? FROM_LIST : null
}
