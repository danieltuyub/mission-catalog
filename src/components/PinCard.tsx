import { useEffect, useRef, useState } from 'react'
import { pinImageUrl } from '../services/pinService'
import type { Pin } from '../types'

// Must be >= the longest exit transition below (duration-[120ms]).
const EXIT_MS = 150
// Content cross-fade when switching pins: fade out, swap, fade in.
const SWAP_OUT_MS = 250

interface Props {
  /** Selected pin, or null to close. The card stays mounted briefly to play the exit transition. */
  pin: Pin | null
  onClose: () => void
  /** Shows an edit button when provided. */
  onEdit?: (pin: Pin) => void
}

export default function PinCard({ pin, onClose, onEdit }: Props) {
  const [shown, setShown] = useState<Pin | null>(pin)
  const [entered, setEntered] = useState(false)
  const [height, setHeight] = useState<number | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Opening from closed: show content right away (the card itself animates in).
  if (pin && !shown) setShown(pin)

  // The same pin was updated (edited): swap in place, no cross-fade.
  if (pin && shown && pin.id === shown.id && pin !== shown) setShown(pin)

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
      setHeight(null)
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

  const mounted = shown !== null

  // Track the content's natural height so the card can grow/shrink smoothly between pins.
  useEffect(() => {
    const el = contentRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) =>
      setHeight(entry.borderBoxSize?.[0]?.blockSize ?? el.offsetHeight),
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [mounted])

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
      <div className="absolute right-3 top-3 flex items-center">
        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(shown)}
            aria-label="Editar"
            title="Editar"
            className="flex size-8 items-center justify-center rounded-full text-gray-500 hover:bg-brand-blush/60 hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-brand-sage"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          title="Cerrar"
          className="flex size-8 items-center justify-center rounded-full text-gray-500 hover:bg-brand-blush/60 hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-brand-sage"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div
        style={height !== null ? { height } : undefined}
        className="overflow-hidden transition-[height] duration-200 ease-out motion-reduce:transition-none"
      >
        <div
          ref={contentRef}
          data-testid="pin-content"
          className={`transition-opacity ease-out motion-reduce:transition-none motion-reduce:opacity-100 ${
            switching ? 'opacity-0 duration-[80ms]' : 'opacity-100 duration-[120ms]'
          }`}
        >
          <h2 className={`${onEdit ? 'pr-16' : 'pr-9'} text-lg font-semibold text-brand-primary`}>{shown.title}</h2>

          {shown.image_path ? (
            <img
              src={pinImageUrl(shown.image_path)}
              alt={shown.title}
              loading="lazy"
              className="mt-3 h-36 w-full rounded-lg bg-brand-blush/30 object-cover"
            />
          ) : (
            <div className="mt-3 flex h-36 items-center justify-center rounded-lg border border-dashed border-brand-sage/70 bg-brand-blush/30 text-sm text-brand-primary/60">
              Foto
            </div>
          )}

          <p className="mt-3 text-sm text-gray-700">{shown.description || 'Sin descripción'}</p>
        </div>
      </div>
    </aside>
  )
}
