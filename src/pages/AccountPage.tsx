import { useEffect, type ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import BackLink from '../components/BackLink'
import PageHeader from '../components/PageHeader'
import PanelTabs from '../components/PanelTabs'
import RequireAuth from '../components/RequireAuth'
import { useAuth } from '../hooks/useAuth'
import { useAccountSection, type AccountSection } from '../hooks/useRoute'
import { useUnreadMessages } from '../hooks/useUnreadMessages'
import { can } from '../services/permissions'
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
  const { t } = useTranslation('account')
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
      <PageHeader title={t('title')}>
        {can(auth, 'users.manage') && (
          <BackLink href="#/admin">{t('admin')}</BackLink>
        )}
      </PageHeader>
      <PanelTabs
        label={t('title')}
        base="cuenta"
        current={current.id}
        tabs={sections.map(({ id }) => ({
          id,
          label: t(`sections.${id}`),
          badge:
            id === 'mensajes' && unread > 0 ? (
              <span
                aria-label={t('unreadBadge', { count: unread })}
                className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-xs font-semibold leading-none text-white"
              >
                {unread > 9 ? '9+' : unread}
              </span>
            ) : undefined,
        }))}
      />
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
