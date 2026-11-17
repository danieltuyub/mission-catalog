export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed'

/** The project's own address, without anything of the visitor's navigation (like `?from=`). */
export function projectShareUrl(id: string): string {
  const { origin, pathname } = window.location
  return `${origin}${pathname}#/proyectos/${encodeURIComponent(id)}`
}

/** Shares a link with the system's share sheet where there is one (phones, Safari); otherwise copies it. */
async function shareUrl(url: string, title: string): Promise<ShareResult> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, url })
      return 'shared'
    } catch (e) {
      // Closing the sheet is not a failure.
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

export const shareProject = (id: string, name: string): Promise<ShareResult> => shareUrl(projectShareUrl(id), name)

/** The map opened on this pin. */
export function pinShareUrl(id: string): string {
  const { origin, pathname } = window.location
  return `${origin}${pathname}#/mapa?pin=${encodeURIComponent(id)}`
}

export const sharePin = (id: string, title: string): Promise<ShareResult> => shareUrl(pinShareUrl(id), title)

/** The pin a shared link points at (`#/mapa?pin=<id>`), if any. */
export function readSharedPinId(hash: string = window.location.hash): string | null {
  return new URLSearchParams(hash.split('?')[1] ?? '').get('pin') || null
}
