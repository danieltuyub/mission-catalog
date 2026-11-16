import { useEffect, useState } from 'react'
import Pagination from '../../components/Pagination'
import ProjectCard from '../../components/ProjectCard'
import { useAuth } from '../../hooks/useAuth'
import { useProjectTab } from '../../hooks/useRoute'
import { useSavedProjects } from '../../hooks/useSavedProjects'
import { can, canEditProject } from '../../services/permissions'
import { getCreatedProjects, getProjectsByIds } from '../../services/projectService'
import { listSavedProjectIds } from '../../services/savedProjects'
import type { Project } from '../../types'

/** Cards per page. */
export const PAGE_SIZE = 4

interface Loaded {
  userId: string
  created: Project[]
  saved: Project[]
  error: string | null
}

const linkButton =
  'mt-4 inline-flex h-10 items-center rounded-full bg-white px-4 text-sm text-brand-primary ring-1 ring-black/5 hover:bg-brand-blush focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage'

/** "Proyectos": the ones the user created (creators only) and, always, the ones they saved. */
export default function ProjectsSection() {
  const auth = useAuth()
  const { userId } = auth
  const isCreator = can(auth, 'projects.create')
  const canSave = can(auth, 'projects.save')
  const { isSaved, toggle, loading: savedLoading } = useSavedProjects()
  const requested = useProjectTab()
  // The page belongs to a tab: switching tab starts again on the first one.
  const [paging, setPaging] = useState({ tab: '', page: 1 })
  const [result, setResult] = useState<Loaded | null>(null)

  // The saved ones are read once: unsaving a card here leaves it in place, so "Deshacer" still has a card to restore.
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    const savedIds = canSave ? listSavedProjectIds() : Promise.resolve<string[]>([])
    Promise.all([isCreator ? getCreatedProjects(userId) : [], savedIds.then(getProjectsByIds)]).then(
      ([created, saved]) => !cancelled && setResult({ userId, created, saved, error: null }),
      () =>
        !cancelled &&
        setResult({ userId, created: [], saved: [], error: 'No se pudieron cargar tus proyectos. Inténtalo de nuevo.' }),
    )
    return () => {
      cancelled = true
    }
  }, [userId, isCreator, canSave])

  const current = result?.userId === userId ? result : null
  if (!current) return <p className="py-10 text-center text-stone-500">Cargando…</p>
  if (current.error)
    return (
      <p role="alert" className="rounded-2xl bg-white p-6 text-sm text-red-700 shadow ring-1 ring-black/5">
        {current.error}
      </p>
    )

  const tabs = [
    ...(isCreator ? [{ id: 'creados' as const, label: 'Creados por mí', projects: current.created }] : []),
    ...(canSave ? [{ id: 'guardados' as const, label: 'Guardados', projects: current.saved }] : []),
  ]
  const tab = tabs.find((t) => t.id === requested) ?? tabs[0]
  if (!tab) return null
  const totalPages = Math.ceil(tab.projects.length / PAGE_SIZE)
  const page = Math.min(paging.tab === tab.id ? paging.page : 1, Math.max(totalPages, 1))
  const shown = tab.projects.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div>
      {/* Chips on the left, pages on the right (as in the project list). Nothing to show: no row. */}
      {(tabs.length > 1 || totalPages > 1) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          {tabs.length > 1 ? (
            <nav aria-label="Proyectos">
              <ul className="flex flex-wrap gap-2">
                {tabs.map((t) => (
                  <li key={t.id}>
                    <a
                      href={`#/cuenta/proyectos/${t.id}`}
                      aria-current={t.id === tab.id ? 'page' : undefined}
                      className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm ring-1 ring-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage ${
                        t.id === tab.id ? 'bg-brand-primary font-medium text-brand-blush' : 'bg-white text-brand-primary hover:bg-brand-blush'
                      }`}
                    >
                      {t.label}
                      <span className={`rounded-full px-2 py-0.5 text-[11px] ${t.id === tab.id ? 'bg-white/15' : 'bg-stone-200 text-stone-600'}`}>
                        {t.projects.length}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : (
            <span />
          )}
          <Pagination page={page} totalPages={totalPages} onChange={(next) => setPaging({ tab: tab.id, page: next })} />
        </div>
      )}

      {tab.projects.length === 0 ? (
        tab.id === 'creados' ? (
          <p className="rounded-2xl bg-white p-6 text-sm text-stone-500 shadow ring-1 ring-black/5">Aún no has creado proyectos.</p>
        ) : (
          <div className="rounded-2xl bg-white p-6 text-stone-600 shadow ring-1 ring-black/5">
            <p>Aún no has guardado proyectos.</p>
            <p className="mt-1 text-sm text-stone-500">Toca el corazón de un proyecto para verlo aquí.</p>
            <a href="#/proyectos" className={linkButton}>
              Ver proyectos
            </a>
          </div>
        )
      ) : (
        <ul className="space-y-4">
          {shown.map((project) => (
            <li key={project.id}>
              <ProjectCard
                project={project}
                from={tab.id}
                editable={canEditProject(auth, project)}
                saved={isSaved(project.id)}
                onToggleSaved={canSave ? () => toggle(project.id) : undefined}
                saveDisabled={savedLoading}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
