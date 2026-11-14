import { useEffect, useRef } from 'react'
import { signOut } from '../services/authService'

interface Props {
  email: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const Icon = ({ d, className }: { d: string; className: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)

export default function UserMenu({ email, open, onOpenChange }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      onOpenChange(false)
      trigger.current?.focus()
    }
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) onOpenChange(false)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open, onOpenChange])

  // Mobile: the panel anchors to the navbar (its right edge matches the burger menu).
  // From md the burger is gone and it anchors to the icon.
  // Both sit 4px below the navbar's bottom edge (on md the icon is 10px above it, hence md:mt-3.5).
  return (
    <div ref={root} className="static md:relative">
      <button
        ref={trigger}
        type="button"
        aria-label="Menú de usuario"
        aria-expanded={open}
        aria-controls="user-menu"
        onClick={() => onOpenChange(!open)}
        className={`flex size-10 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage ${
          open ? 'bg-brand-sage text-brand-primary' : 'bg-white/10 text-brand-blush hover:bg-white/20'
        }`}
      >
        {/* Head and shoulders */}
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </button>

      {/* Always mounted so closing can animate; `inert` keeps it out of reach while hidden. */}
      <div
        id="user-menu"
        inert={!open}
        className={`absolute right-0 top-full z-10 mt-1 w-64 md:mt-3.5 rounded-2xl bg-brand-primary p-2 text-brand-blush shadow-lg shadow-brand-primary/25 ring-1 ring-white/10 transition-[opacity,translate] ease-out motion-reduce:translate-y-0 motion-reduce:transition-opacity ${
          open ? 'translate-y-0 opacity-100 duration-150' : 'pointer-events-none -translate-y-2 opacity-0 duration-100'
        }`}
      >
        <div className="px-3 py-2">
          <p className="text-xs text-brand-blush/60">Sesión iniciada</p>
          <p title={email} className="truncate text-sm">
            {email}
          </p>
        </div>
        <div role="separator" className="my-1 h-px bg-white/10" />
        <a
          href="#/cuenta"
          onClick={() => onOpenChange(false)}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-brand-sage"
        >
          <Icon d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M16 7a4 4 0 11-8 0 4 4 0 018 0z" className="size-4" />
          Mi cuenta
        </a>
        <button
          type="button"
          onClick={() => {
            onOpenChange(false)
            void signOut().then(() => {
              window.location.hash = '#/mapa'
            })
          }}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-brand-sage"
        >
          <Icon d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" className="size-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
