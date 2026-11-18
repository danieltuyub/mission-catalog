import { useEffect, useState, type ReactNode } from 'react'

/** Matches the transition below: the content stays mounted this long while it closes. */
const EXIT_MS = 220
// Room around the content so shadows and focus rings are not clipped by `overflow-hidden`.
const GUTTER = 'p-2'

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/**
 * Opens and closes its content with a height and fade transition (top to bottom), and unmounts it
 * once closed, so its state starts fresh the next time.
 *
 * Meant for a child of a flex or grid parent with `gap-4`: while closed it cancels that gap, so it
 * takes no room, and the gap grows in with the content instead of jumping.
 */
export default function Collapsible({ open, children }: { open: boolean; children: ReactNode }) {
  const [mounted, setMounted] = useState(open)
  // Lags one paint behind `mounted`, so the browser has a collapsed state to animate from.
  const [entered, setEntered] = useState(false)

  if (open && !mounted) setMounted(true)

  useEffect(() => {
    if (open) {
      let second = 0
      const first = requestAnimationFrame(() => {
        second = requestAnimationFrame(() => setEntered(true))
      })
      return () => {
        cancelAnimationFrame(first)
        cancelAnimationFrame(second)
      }
    }
    const timer = setTimeout(
      () => {
        setMounted(false)
        setEntered(false)
      },
      reducedMotion() ? 0 : EXIT_MS,
    )
    return () => clearTimeout(timer)
  }, [open])

  if (!mounted) return null
  const expanded = open && entered

  return (
    <div
      className={`grid -mx-2 -mb-2 transition-[grid-template-rows,opacity,margin-top] duration-200 ease-out motion-reduce:transition-none ${
        expanded ? '-mt-2 grid-rows-[1fr] opacity-100' : '-mt-6 grid-rows-[0fr] opacity-0'
      }`}
    >
      {/* `inert` while closing: nothing inside can be focused or clicked as it goes away. */}
      <div inert={!open} className={`min-h-0 overflow-hidden ${GUTTER}`}>
        {children}
      </div>
    </div>
  )
}
