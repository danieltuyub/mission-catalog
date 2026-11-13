import BackLink from '../components/BackLink'
import ProjectForm, { type ProjectFormData } from '../components/ProjectForm'
import PageHeader from '../components/PageHeader'
import { createProjectWithImages } from '../services/projectAdmin'
import { clearFilterOptionsCache } from '../services/projectService'

const goToList = () => {
  window.location.hash = '#/proyectos'
}

export default function ProjectFormPage() {
  async function save({ project, images }: ProjectFormData) {
    const files = images.flatMap((image) => (image.kind === 'new' ? [image.file] : []))
    const created = await createProjectWithImages(project, files)
    // A new country/region/responsible may now exist: refetch the filter options.
    clearFilterOptionsCache()
    window.location.hash = `#/proyectos/${created.id}`
  }

  return (
    <div className="mx-auto w-[94%] max-w-3xl">
      <nav aria-label="Volver" className="pb-4">
        <BackLink href="#/proyectos">Proyectos</BackLink>
      </nav>
      <PageHeader title="Nuevo proyecto" />
      <ProjectForm onSubmit={save} onCancel={goToList} />
    </div>
  )
}
