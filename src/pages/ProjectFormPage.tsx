import BackLink from '../components/BackLink'
import ProjectForm, { type ProjectFormData } from '../components/ProjectForm'
import PageHeader from '../components/PageHeader'
import { originBack, readEditOrigin } from '../services/editOrigin'
import { createProjectWithImages } from '../services/projectAdmin'
import { clearFilterOptionsCache } from '../services/projectService'

export default function ProjectFormPage() {
  // Opened from a list (the admin panel): saving or cancelling leads back to it.
  const origin = readEditOrigin()
  const back = originBack(origin ?? 'lista')
  const goBack = () => {
    window.location.hash = back.href
  }

  async function save({ project, images }: ProjectFormData) {
    const files = images.flatMap((image) => (image.kind === 'new' ? [image.file] : []))
    const created = await createProjectWithImages(project, files)
    // A new country/region/responsible may now exist: refetch the filter options.
    clearFilterOptionsCache()
    if (origin) goBack()
    else window.location.hash = `#/proyectos/${created.id}`
  }

  return (
    <div className="mx-auto w-[94%] max-w-3xl">
      <nav aria-label="Volver" className="pb-4">
        <BackLink href={back.href}>{back.label}</BackLink>
      </nav>
      <PageHeader title="Nuevo proyecto" />
      <ProjectForm onSubmit={save} onCancel={goBack} />
    </div>
  )
}
