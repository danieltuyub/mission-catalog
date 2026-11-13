import BackLink from '../components/BackLink'
import PageHeader from '../components/PageHeader'
import ProjectForm, { type ProjectFormData } from '../components/ProjectForm'
import { useProject } from '../hooks/useProject'
import { updateProjectWithImages } from '../services/projectAdmin'
import { clearFilterOptionsCache } from '../services/projectService'

export default function ProjectEditPage({ id }: { id: string }) {
  const { project, loading, error } = useProject(id)
  const detail = `#/proyectos/${id}`

  async function save({ project: patch, images }: ProjectFormData) {
    await updateProjectWithImages(id, patch, images)
    // Country, region or responsible may have changed: refetch the filter options.
    clearFilterOptionsCache()
    window.location.hash = detail
  }

  return (
    <div className="mx-auto w-[94%] max-w-3xl">
      <nav aria-label="Volver" className="pb-4">
        <BackLink href={detail}>Proyecto</BackLink>
      </nav>
      <PageHeader title="Editar proyecto" />
      {loading && <p className="py-24 text-center text-stone-500">Cargando proyecto…</p>}
      {error && (
        <p role="alert" className="py-24 text-center text-red-700">
          No se pudo cargar el proyecto: {error}
        </p>
      )}
      {!loading && !error && !project && (
        <p className="py-24 text-center text-stone-500">No existe un proyecto con ese enlace.</p>
      )}
      {project && (
        <ProjectForm
          project={project}
          onSubmit={save}
          onCancel={() => {
            window.location.hash = detail
          }}
        />
      )}
    </div>
  )
}
