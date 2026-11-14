import { useEffect, useState, useSyncExternalStore } from 'react'
import { dismissToast, getToast, subscribeToast, type Toast } from '../services/toast'

// Long enough to read; the ones with a button get more time to reach it.
const DURATION_MS = 4000
const DURATION_WITH_ACTION_MS = 6000

/** Mount once. Shows the current toast at the bottom centre, fading in and out. */
export default function Toaster() {
  const toast = useSyncExternalStore(subscribeToast, getToast)
  // The last toast stays rendered while it fades out.
  const [shown, setShown] = useState<Toast | null>(toast)
  if (toast && toast !== shown) setShown(toast)
  // Hover or focus pauses the countdown. Tied to a toast id so it cannot leak into the next one.
  const [pausedId, setPausedId] = useState<number | null>(null)
  const paused = !!toast && pausedId === toast.id

  useEffect(() => {
    if (!toast || paused) return
    const timer = window.setTimeout(() => dismissToast(toast.id), toast.action ? DURATION_WITH_ACTION_MS : DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [toast, paused])

  const open = !!toast

  return (
    // Above the map controls (z-index 1000). The wrapper never blocks clicks; only the card does.
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[1100] flex justify-center px-4"
    >
      {shown && (
        <div
          data-state={open ? 'open' : 'closed'}
          onMouseEnter={() => toast && setPausedId(toast.id)}
          onMouseLeave={() => setPausedId(null)}
          onFocus={() => toast && setPausedId(toast.id)}
          onBlur={() => setPausedId(null)}
          // `invisible` only flips once the fade-out ends, so the closed toast is also gone for screen readers.
          className={`flex max-w-md items-center gap-4 rounded-2xl bg-brand-primary px-4 py-3 text-sm text-brand-blush shadow-lg shadow-brand-primary/25 ring-1 ring-white/10 transition-[opacity,translate,visibility] ease-out motion-reduce:translate-y-0 motion-reduce:transition-opacity ${
            open ? 'pointer-events-auto visible translate-y-0 opacity-100 duration-200' : 'invisible translate-y-2 opacity-0 duration-150'
          }`}
        >
          <span>{shown.message}</span>
          {shown.action && (
            <button
              type="button"
              onClick={() => {
                shown.action?.onClick()
                dismissToast(shown.id)
              }}
              className="shrink-0 rounded-full px-2 py-1 font-medium text-brand-sage underline underline-offset-2 hover:text-brand-blush focus-visible:outline-2 focus-visible:outline-brand-sage"
            >
              {shown.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
