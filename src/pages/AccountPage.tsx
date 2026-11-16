import { useEffect, type ComponentType } from 'react'
import PageHeader from '../components/PageHeader'
import RequireAuth from '../components/RequireAuth'
import { useAuth } from '../hooks/useAuth'
import { useAccountSection, type AccountSection } from '../hooks/useRoute'
import { useUnreadMessages } from '../hooks/useUnreadMessages'
import MessagesSection from './account/MessagesSection'
import ProfileSection from './account/ProfileSection'
import ProjectsSection from './account/ProjectsSection'
import RequestsSection from './account/RequestsSection'
import { sectionsFor } from './account/sections'

const CONTENT: Record<AccountSection, ComponentType> = {
  mensajes: MessagesSection,
  solicitudes: RequestsSection,
  proyectos: ProjectsSection,
  perfil: ProfileSection,
}

function Panel() {
  const auth = useAuth()
  const section = useAccountSection()
  const unread = useUnreadMessages()
  const sections = sectionsFor(auth)
  const current = sections.find((s) => s.id === section)

  // `#/cuenta`, an unknown section or one this account cannot use: go to the first one it can.
  useEffect(() => {
    if (!current) window.location.replace(`#/cuenta/${sections[0].id}`)
  }, [current, sections])

  if (!current) return null
  const Content = CONTENT[current.id]

  return (
    <div className="mx-auto w-[94%] pb-10 md:w-4/5">
      <PageHeader title="Mi espacio" />
      {/* Same pill language as the navbar and the filters; scrolls sideways on narrow screens. */}
      <nav aria-label="Mi espacio" className="-mx-1 mb-6 overflow-x-auto px-1 pb-1">
        <ul className="flex w-max gap-2">
          {sections.map(({ id, label }) => {
            const active = id === current.id
            return (
              <li key={id}>
                <a
                  href={`#/cuenta/${id}`}
                  aria-current={active ? 'page' : undefined}
                  className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm ring-1 ring-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage ${
                    active ? 'bg-brand-primary font-medium text-brand-blush' : 'bg-white text-brand-primary hover:bg-brand-blush'
                  }`}
                >
                  {label}
                  {id === 'mensajes' && unread > 0 && (
                    <span
                      aria-label={`${unread} sin leer`}
                      className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-xs font-semibold leading-none text-white"
                    >
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </a>
              </li>
            )
          })}
        </ul>
      </nav>
      <Content />
    </div>
  )
}

export default function AccountPage() {
  return (
    <RequireAuth>
      <Panel />
    </RequireAuth>
  )
}
