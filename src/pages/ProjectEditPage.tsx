import { useEffect } from 'react'
import BackLink from '../components/BackLink'
import PageHeader from '../components/PageHeader'
import ProjectForm, { type ProjectFormData } from '../components/ProjectForm'
import { useDelayed } from '../hooks/useDelayed'
import { useProject } from '../hooks/useProject'
import { readEditOrigin } from '../services/editOrigin'
import { updateProjectWithImages } from '../services/projectAdmin'
import { clearFilterOptionsCache } from '../services/projectService'
import { SKELETON_DELAY_MS } from './projectsConfig'

export default function ProjectEditPage({ id }: { id: string }) {
  const { project, loading, error } = useProject(id)
  const showPlaceholder = useDelayed(loading, SKELETON_DELAY_MS)
  // Back where the user came from: the list, or (by default) the project detail.
  const fromList = readEditOrigin() === 'lista'
  const back = fromList ? '#/proyectos' : `#/proyectos/${id}`

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
        <BackLink href={back}>{fromList ? 'Proyectos' : 'Proyecto'}</BackLink>
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
      {project && (
        <div className="animate-fade-in motion-reduce:animate-none">
          <ProjectForm
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
