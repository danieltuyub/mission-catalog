import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  /** Accessible name of the dialog. */
  label: string
  onClose: () => void
  children: ReactNode
}

/** A project form over the admin's list: the list below stays as it is, and so does its scroll. */
export default function ProjectModal({ label, onClose, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[4000] overflow-y-auto bg-black/40 p-4 md:py-8"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-label={label} className="mx-auto max-w-3xl rounded-2xl bg-white shadow-xl">
        {children}
      </div>
    </div>,
    document.body,
  )
}
