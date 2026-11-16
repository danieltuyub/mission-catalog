import { useEffect, useState, type ComponentType } from 'react'
import PageHeader from '../components/PageHeader'
import PanelTabs from '../components/PanelTabs'
import { useAdminSection, type AdminSection } from '../hooks/useRoute'
import { countPendingRequests } from '../services/pinRequests'
import ModerationSection from './admin/ModerationSection'
import PinRequestsSection from './admin/PinRequestsSection'
import PinsSection from './admin/PinsSection'
import ProjectsAdminSection from './admin/ProjectsAdminSection'
import UsersSection from './admin/UsersSection'

const ADMIN_TABS: readonly { id: AdminSection; label: string }[] = [
  { id: 'solicitudes', label: 'Solicitudes de pines' },
  { id: 'pines', label: 'Pines' },
  { id: 'proyectos', label: 'Proyectos' },
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'mensajes', label: 'Mensajes' },
]

const CONTENT: Record<AdminSection, ComponentType> = {
  solicitudes: PinRequestsSection,
  pines: PinsSection,
  proyectos: ProjectsAdminSection,
  usuarios: UsersSection,
  mensajes: ModerationSection,
}

/** The admin panel. Wrapped in `RequireAuth` (users.manage) by the router. */
export default function AdminPage() {
  const section = useAdminSection()
  const [pending, setPending] = useState(0)

  // `#/admin`, or an unknown section: the first one.
  useEffect(() => {
    if (!section) window.location.replace(`#/admin/${ADMIN_TABS[0].id}`)
  }, [section])

  // The badge on "Solicitudes": refreshed whenever the section changes.
  useEffect(() => {
    let cancelled = false
    countPendingRequests().then(
      (n) => !cancelled && setPending(n),
      () => {},
    )
    return () => {
      cancelled = true
    }
  }, [section])

  if (!section) return null
  const Content = CONTENT[section]

  return (
    <div className="mx-auto w-[94%] pb-10 md:w-4/5">
      <PageHeader title="Administración">
        <a
          href="#/cuenta"
          className="inline-flex h-10 items-center rounded-full bg-white px-4 text-sm text-brand-primary ring-1 ring-black/5 hover:bg-brand-blush focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage"
        >
          Mi espacio
        </a>
      </PageHeader>
      <PanelTabs
        label="Administración"
        base="admin"
        current={section}
        tabs={ADMIN_TABS.map(({ id, label }) => ({
          id,
          label,
          badge:
            id === 'solicitudes' && pending > 0 ? (
              <span
                aria-label={`${pending} pendientes`}
                className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-xs font-semibold leading-none text-white"
              >
                {pending > 9 ? '9+' : pending}
              </span>
            ) : undefined,
        }))}
      />
      <Content />
    </div>
  )
}
