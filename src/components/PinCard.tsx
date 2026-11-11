import { useEffect, useState } from 'react'
import type { Pin } from '../types'

// Must be >= the longest exit transition below (duration-[120ms]).
const EXIT_MS = 150
// Content cross-fade when switching pins: fade out, swap, fade in.
const SWAP_OUT_MS = 250

interface Props {
  /** Selected pin, or null to close. The card stays mounted briefly to play the exit transition. */
  pin: Pin | null
  onClose: () => void
}

export default function PinCard({ pin, onClose }: Props) {
  const [shown, setShown] = useState<Pin | null>(pin)
  const [entered, setEntered] = useState(false)

  // Opening from closed: show content right away (the card itself animates in).
  if (pin && !shown) setShown(pin)

  // Another pin selected while open: the card stays put, only its content cross-fades.
  const switching = pin !== null && shown !== null && pin !== shown

  useEffect(() => {
    if (pin) {
      const frame = requestAnimationFrame(() => setEntered(true))
      return () => cancelAnimationFrame(frame)
    }
    const timer = setTimeout(() => {
      setShown(null)
      setEntered(false)
    }, EXIT_MS)
    return () => clearTimeout(timer)
  }, [pin])

  useEffect(() => {
    if (!switching) return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    // Rapid clicks: cleanup cancels the pending swap and the latest pin wins.
    const timer = setTimeout(() => setShown(pin), reduced ? 0 : SWAP_OUT_MS)
    return () => clearTimeout(timer)
  }, [switching, pin])

  if (!shown) return null

  const visible = entered && pin !== null

  return (
    <aside
      aria-label="Detalle del pin"
      className={`absolute right-4 top-4 z-[1000] max-h-[calc(100%-2rem)] w-80 max-w-[calc(100%-2rem)] overflow-y-auto rounded-xl bg-white p-4 shadow-xl ring-1 ring-black/5 transition-[opacity,translate] ease-out motion-reduce:translate-x-0 motion-reduce:transition-opacity ${
        visible
          ? 'translate-x-0 opacity-100 duration-[180ms]'
          : 'pointer-events-none translate-x-3 opacity-0 duration-[120ms]'
      }`}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="absolute right-3 top-3 rounded-full px-2 text-xl leading-8 text-gray-500 hover:bg-brand-blush/60 hover:text-brand-primary"
      >
        ×
      </button>

      <div
        data-testid="pin-content"
        className={`transition-opacity ease-out motion-reduce:transition-none motion-reduce:opacity-100 ${
          switching ? 'opacity-0 duration-[80ms]' : 'opacity-100 duration-[120ms]'
        }`}
      >
        <h2 className="pr-9 text-lg font-semibold text-brand-primary">{shown.title}</h2>

        <div className="mt-3 flex h-36 items-center justify-center rounded-lg border border-dashed border-brand-sage/70 bg-brand-blush/30 text-sm text-brand-primary/60">
          Foto
        </div>

        <p className="mt-3 text-sm text-gray-700">{shown.description || 'Sin descripción'}</p>
      </div>
    </aside>
  )
}
