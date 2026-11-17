import { createProjectWithImages } from '../services/projectAdmin'
import { clearFilterOptionsCache } from '../services/projectService'
import type { Project } from '../types'
import ProjectForm, { type ProjectFormData } from './ProjectForm'

interface Props {
  /** The project was created. */
  onCreated: (project: Project) => void
  onCancel: () => void
}

/** The new-project form with its saving: the same body for the page and for the admin's modal. */
export default function ProjectCreator({ onCreated, onCancel }: Props) {
  async function save({ project, images }: ProjectFormData) {
    const files = images.flatMap((image) => (image.kind === 'new' ? [image.file] : []))
    const created = await createProjectWithImages(project, files)
    // A new country/region/responsible may now exist: refetch the filter options.
    clearFilterOptionsCache()
    onCreated(created)
  }

  return <ProjectForm onSubmit={save} onCancel={onCancel} />
}
