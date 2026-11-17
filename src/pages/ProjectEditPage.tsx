import { useEffect, useMemo, type ComponentProps } from 'react'
import BackLink from '../components/BackLink'
import PageHeader from '../components/PageHeader'
import ProjectForm, { type ProjectFormData } from '../components/ProjectForm'
import { useDelayed } from '../hooks/useDelayed'
import { useAuth } from '../hooks/useAuth'
import { useProject } from '../hooks/useProject'
import { useUsers } from '../hooks/useUsers'
import { originBack, readEditOrigin } from '../services/editOrigin'
import { can, canEditProject } from '../services/permissions'
import { updateProjectWithImages } from '../services/projectAdmin'
import { clearFilterOptionsCache } from '../services/projectService'
import { SKELETON_DELAY_MS } from './projectsConfig'

/** The form with the owner field, for admins (the list of users is theirs to read). */
function AdminProjectForm(props: ComponentProps<typeof ProjectForm>) {
  const { users, nameOf } = useUsers()
  // Who can own a project: creators and admins, and whoever owns this one now.
  const options = useMemo(() => {
    const current = props.project?.created_by
    return users
      .filter((u) => u.role === 'creator' || u.role === 'admin' || u.id === current)
      .map((u) => ({ id: u.id, name: nameOf(u.id) }))
  }, [users, nameOf, props.project?.created_by])
  // Without the list the field would show an empty owner: keep it out until it is there.
  return <ProjectForm {...props} creator={users.length > 0 ? { options } : undefined} />
}

export default function ProjectEditPage({ id }: { id: string }) {
  const { project, loading, error } = useProject(id)
  const auth = useAuth()
  const allowed = !project || canEditProject(auth, project)
  const Form = can(auth, 'users.manage') ? AdminProjectForm : ProjectForm
  const showPlaceholder = useDelayed(loading, SKELETON_DELAY_MS)
  // Back where the user came from: a list, or (by default) the project detail.
  const origin = readEditOrigin()
  const back = origin ? originBack(origin).href : `#/proyectos/${id}`

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  async function save({ project: patch, images }: ProjectFormData) {
    await updateProjectWithImages(id, patch, images)
    // Country, region or responsible may have changed: refetch the filter options.
    clearFilterOptionsCache()
    window.location.hash = back
  }

  return (
    <div className="mx-auto w-[94%] max-w-3xl">
      <nav aria-label="Volver" className="pb-4">
        <BackLink href={back}>{origin ? originBack(origin).label : 'Proyecto'}</BackLink>
      </nav>
      <PageHeader title="Editar proyecto" />
      {loading && (
        // Reserves the form's space; shown only if loading outlasts the delay (no flash).
        <div
          role="status"
          aria-label="Cargando proyecto"
          className={`h-[40rem] rounded-2xl bg-stone-200/60 motion-safe:animate-pulse ${showPlaceholder ? '' : 'opacity-0'}`}
        />
      )}
      {error && (
        <p role="alert" className="py-24 text-center text-red-700">
          No se pudo cargar el proyecto: {error}
        </p>
      )}
      {!loading && !error && !project && (
        <p className="py-24 text-center text-stone-500">No existe un proyecto con ese enlace.</p>
      )}
      {project && !allowed && (
        <p role="alert" className="py-24 text-center text-stone-500">
          No tienes permiso para editar este proyecto
        </p>
      )}
      {project && allowed && (
        <div className="animate-fade-in motion-reduce:animate-none">
          <Form
            project={project}
            onSubmit={save}
            onCancel={() => {
              window.location.hash = back
            }}
          />
        </div>
      )}
    </div>
  )
}
