export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed'

/** The project's own address, without anything of the visitor's navigation (like `?from=`). */
export function projectShareUrl(id: string): string {
  const { origin, pathname } = window.location
  return `${origin}${pathname}#/proyectos/${encodeURIComponent(id)}`
}

/**
 * Shares the project with the system's share sheet where there is one (phones, Safari);
 * otherwise copies the link. Closing the sheet is not a failure.
 */
export async function shareProject(id: string, name: string): Promise<ShareResult> {
  const url = projectShareUrl(id)

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: name, url })
      return 'shared'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
      // Any other failure of the sheet: fall through to copying.
    }
  }

  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    return 'failed'
  }
}
