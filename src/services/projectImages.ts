import type { Photo } from '../components/PhotoCarousel'
import type { Project } from '../types'
import { supabase } from './supabaseClient'

const BUCKET = 'project-images'

export function projectImageUrl(path: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

/** Project photos in `position` order, ready for the carousel. */
export function projectPhotos(project: Project): Photo[] {
  return [...(project.project_images ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((img, i) => ({
      src: projectImageUrl(img.path),
      alt: img.alt || `${project.name} — foto ${i + 1}`,
    }))
}
