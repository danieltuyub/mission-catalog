import { useEffect, type ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import { loginUrl } from '../services/authRedirect'
import { can } from '../services/permissions'

interface Props {
  /** Needed to see the page: any one of these (admins always pass). Omit to allow any signed-in user. */
  permission?: string | string[]
  children: ReactNode
}

/** Renders children only with the permission; sends signed-out visitors to the login and back. */
export default function RequireAuth({ permission, children }: Props) {
  const auth = useAuth()
  const { loading, email } = auth
  const signedOut = !loading && !email
  const allowed = permission === undefined || [permission].flat().some((p) => can(auth, p))

  useEffect(() => {
    if (signedOut) window.location.replace(loginUrl(window.location.hash.replace(/^#/, '') || '/'))
  }, [signedOut])

  if (loading || signedOut) return null
  if (!allowed) {
    return (
      <div className="mx-auto w-[94%] py-24 text-center text-stone-500 md:w-4/5">
        <p role="alert">No tienes permiso para ver esta página</p>
        <a
          href="#/mapa"
          className="mt-3 inline-block rounded-full px-4 py-1.5 text-sm text-brand-primary underline hover:bg-brand-blush/70 focus-visible:outline-2 focus-visible:outline-brand-sage"
        >
          Volver al mapa
        </a>
      </div>
    )
  }
  return <>{children}</>
}
