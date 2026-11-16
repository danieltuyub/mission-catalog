import { useEffect, useState, type ReactNode } from 'react'
import ProjectCard from '../../components/ProjectCard'
import { useAuth } from '../../hooks/useAuth'
import { useSavedProjects } from '../../hooks/useSavedProjects'
import { can, canEditProject } from '../../services/permissions'
import { getCreatedProjects, getProjectsByIds } from '../../services/projectService'
import { listSavedProjectIds } from '../../services/savedProjects'
import type { Project } from '../../types'

interface Loaded {
  userId: string
  created: Project[]
  saved: Project[]
  error: string | null
}

const linkButton =
  'mt-4 inline-flex h-10 items-center rounded-full bg-white px-4 text-sm text-brand-primary ring-1 ring-black/5 hover:bg-brand-blush focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage'

function Block({ id, title, count, children }: { id: string; title: string; count: number; children: ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
        {title}
        <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[11px] text-stone-600">{count}</span>
      </h2>
      {children}
    </section>
  )
}

/** "Proyectos": the ones the user created (creators only) and, always, the ones they saved. */
export default function ProjectsSection() {
  const auth = useAuth()
  const { userId } = auth
  const isCreator = can(auth, 'projects.create')
  const canSave = can(auth, 'projects.save')
  const { isSaved, toggle, loading: savedLoading } = useSavedProjects()
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

  const list = (projects: Project[]) => (
    <ul className="space-y-4">
      {projects.map((project) => (
        <li key={project.id}>
          <ProjectCard
            project={project}
            editable={canEditProject(auth, project)}
            saved={isSaved(project.id)}
            onToggleSaved={canSave ? () => toggle(project.id) : undefined}
            saveDisabled={savedLoading}
          />
        </li>
      ))}
    </ul>
  )

  return (
    <div className="space-y-8">
      {isCreator && (
        <Block id="account-created" title="Creados por mí" count={current.created.length}>
          {current.created.length > 0 ? (
            list(current.created)
          ) : (
            <p className="rounded-2xl bg-white p-6 text-sm text-stone-500 shadow ring-1 ring-black/5">Aún no has creado proyectos.</p>
          )}
        </Block>
      )}
      {canSave && (
        <Block id="account-saved" title="Guardados" count={current.saved.length}>
          {current.saved.length > 0 ? (
            list(current.saved)
          ) : (
            <div className="rounded-2xl bg-white p-6 text-stone-600 shadow ring-1 ring-black/5">
              <p>Aún no has guardado proyectos.</p>
              <p className="mt-1 text-sm text-stone-500">Toca el corazón de un proyecto para verlo aquí.</p>
              <a href="#/proyectos" className={linkButton}>
                Ver proyectos
              </a>
            </div>
          )}
        </Block>
      )}
    </div>
  )
}
