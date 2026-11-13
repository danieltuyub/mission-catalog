import type { Photo } from '../components/PhotoCarousel'
import type { Project } from '../types'
import { compressImage } from './imageUtils'
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

/** Compress and upload to `<projectId>/<uuid>.webp`; returns the storage path. */
export async function uploadProjectImage(projectId: string, file: File): Promise<string> {
  const blob = await compressImage(file)
  const path = `${projectId}/${crypto.randomUUID()}.webp`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: 'image/webp',
    cacheControl: '31536000',
  })
  if (error) throw error
  return path
}

export async function removeProjectImageFiles(paths: string[]): Promise<void> {
  if (paths.length === 0) return
  await supabase.storage.from(BUCKET).remove(paths)
}

/** Links uploaded files to the project; `position` follows the array order. */
export async function insertProjectImages(projectId: string, paths: string[]): Promise<void> {
  const rows = paths.map((path, position) => ({ project_id: projectId, path, position }))
  const { error } = await supabase.from('project_images').insert(rows)
  if (error) throw error
}
