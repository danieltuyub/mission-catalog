import ProjectForm, { type ProjectFormData } from '../components/ProjectForm'
import PageHeader from '../components/PageHeader'
import { createProjectWithImages } from '../services/projectAdmin'
import { clearFilterOptionsCache } from '../services/projectService'

const goToList = () => {
  window.location.hash = '#/proyectos'
}

export default function ProjectFormPage() {
  async function save({ project, images }: ProjectFormData) {
    const created = await createProjectWithImages(project, images)
    // A new country/region/responsible may now exist: refetch the filter options.
    clearFilterOptionsCache()
    window.location.hash = `#/proyectos/${created.id}`
  }

  return (
    <div className="mx-auto w-[94%] max-w-3xl">
      <nav aria-label="Volver" className="pb-4">
        <a
          href="#/proyectos"
          className="inline-flex h-10 items-center gap-2 rounded-full bg-white pl-3 pr-4 text-sm text-brand-primary ring-1 ring-black/5 hover:bg-brand-blush focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Proyectos
        </a>
      </nav>
      <PageHeader title="Nuevo proyecto" />
      <ProjectForm onSubmit={save} onCancel={goToList} />
    </div>
  )
}
