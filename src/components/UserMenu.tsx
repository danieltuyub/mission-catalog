import { useEffect, useRef } from 'react'
import { isPrivateRoute } from '../hooks/useRoute'
import { signOut } from '../services/authService'
import { fullName, initials } from '../services/displayName'
import { showToast } from '../services/toast'

interface Props {
  email: string
  firstName: string
  lastName: string
  /** True while the session (and the profile) is still being resolved. */
  loading: boolean
  /** Messages not read yet. */
  unread: number
  /** Admins get the admin area; everyone else their own space. */
  isAdmin: boolean
  /** On the account or admin pages: the avatar says so. */
  active: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}

const Icon = ({ d, className }: { d: string; className: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)

export default function UserMenu({ email, firstName, lastName, loading, unread, isAdmin, active, open, onOpenChange }: Props) {
  const name = fullName(firstName, lastName)
  const letters = initials(firstName, lastName)
  const unreadLabel = unread > 0 ? `${unread} ${unread === 1 ? 'mensaje sin leer' : 'mensajes sin leer'}` : ''
  const unreadText = unread > 9 ? '9+' : String(unread)
  // The first name is required in "Mi cuenta", so an empty one means the profile is not filled in.
  // Not while loading: the names are not known yet.
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
        aria-label={`${name ? `Menú de usuario de ${name}` : 'Menú de usuario'}${unreadLabel ? `, ${unreadLabel}` : ''}`}
        aria-expanded={open}
        aria-controls="user-menu"
        onClick={() => onOpenChange(!open)}
        className={`relative flex size-10 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage ${
          open ? 'bg-brand-sage text-brand-primary' : `bg-white/10 text-brand-blush hover:bg-white/20 ${active ? 'ring-2 ring-brand-sage' : ''}`
        }`}
      >
        {letters ? (
          <span aria-hidden="true" className="text-sm font-semibold">
            {letters}
          </span>
        ) : (
          /* Head and shoulders */
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        )}
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-semibold leading-none text-white ring-2 ring-brand-primary"
          >
            {unreadText}
          </span>
        )}
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
          {name ? (
            <>
              <p title={name} className="truncate text-sm font-medium">
                {name}
              </p>
              <p title={email} className="truncate text-xs text-brand-blush/60">
                {email}
              </p>
            </>
          ) : (
            <>
              <p title={email} className="truncate text-sm">
                {email}
              </p>
              {!loading && !firstName.trim() && (
                <a
                  href="#/cuenta/perfil"
                  onClick={() => onOpenChange(false)}
                  className="text-xs text-brand-blush/70 underline underline-offset-2 hover:text-brand-blush focus-visible:outline-2 focus-visible:outline-brand-sage"
                >
                  Completa tu nombre
                </a>
              )}
            </>
          )}
        </div>
        <div role="separator" className="my-1 h-px bg-white/10" />
        <a
          href={isAdmin ? '#/admin' : '#/cuenta'}
          onClick={() => onOpenChange(false)}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-brand-sage"
        >
          <Icon
            d={
              isAdmin
                ? 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'
                : 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z'
            }
            className="size-4"
          />
          {isAdmin ? 'Administración' : 'Mi espacio'}
          {unread > 0 && (
            <span
              aria-label={unreadLabel}
              className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-xs font-semibold leading-none text-white"
            >
              {unreadText}
            </span>
          )}
        </a>
        <button
          type="button"
          onClick={async () => {
            onOpenChange(false)
            try {
              await signOut()
            } catch {
              showToast('No se pudo cerrar la sesión. Inténtalo de nuevo.')
              return
            }
            // Public pages stay as they are (they just turn into the guest view); private ones cannot.
            if (isPrivateRoute()) window.location.hash = '#/mapa'
            showToast('Sesión cerrada')
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
