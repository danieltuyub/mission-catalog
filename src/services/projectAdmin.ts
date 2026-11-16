import type { Project } from '../types'
import {
  addProjectImageRows,
  deleteProjectImageRows,
  insertProjectImages,
  listProjectImages,
  removeProjectImageFiles,
  saveImagePositions,
  uploadProjectImage,
} from './projectImages'
import { supabase } from './supabaseClient'

const TABLE = 'projects'

export type NewProject = Pick<Project, 'name'> &
  Partial<
    Pick<Project, 'responsible' | 'description' | 'details' | 'started_at' | 'country' | 'region' | 'phone' | 'mail' | 'status'>
  >

/** A photo in the form: one already saved, or a file still to upload. */
export type ImageInput = { kind: 'existing'; id: string; path: string } | { kind: 'new'; file: File }

export async function createProject(input: NewProject): Promise<Project> {
  const { data, error } = await supabase.from(TABLE).insert(input).select('*').single()
  if (error) throw error
  return data as Project
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw error
}

/**
 * Creates the project, then uploads its photos in order. Either everything is saved or
 * nothing is: on a failure the uploaded files and the project row are removed.
 */
export async function createProjectWithImages(input: NewProject, files: File[]): Promise<Project> {
  const project = await createProject(input)
  if (files.length === 0) return project

  const paths: string[] = []
  try {
    for (const file of files) paths.push(await uploadProjectImage(project.id, file))
    await insertProjectImages(project.id, paths)
    return project
  } catch (e) {
    await removeProjectImageFiles(paths).catch(() => {})
    await deleteProject(project.id).catch(() => {})
    throw e
  }
}

export async function updateProject(id: string, patch: NewProject): Promise<Project> {
  const { data, error } = await supabase.from(TABLE).update(patch).eq('id', id).select('*').single()
  if (error) throw error
  return data as Project
}

/**
 * Saves the project fields and syncs its photos to `images` (final order, first = cover):
 * new files are uploaded, kept ones are re-positioned, removed ones are deleted.
 * A failure before the photos are linked removes the new uploads and leaves the old
 * photos untouched. Files of removed photos are deleted last, only after everything worked.
 */
export async function updateProjectWithImages(id: string, patch: NewProject, images: ImageInput[]): Promise<Project> {
  const uploaded: string[] = []
  let linked = false
  try {
    const kept: { id: string; path: string; position: number }[] = []
    const added: { path: string; position: number }[] = []
    for (const [position, image] of images.entries()) {
      if (image.kind === 'existing') kept.push({ id: image.id, path: image.path, position })
      else {
        const path = await uploadProjectImage(id, image.file)
        uploaded.push(path)
        added.push({ path, position })
      }
    }

    const project = await updateProject(id, patch)
    const current = await listProjectImages(id)
    await saveImagePositions(id, kept)
    await addProjectImageRows(id, added)
    linked = true

    const keptIds = new Set(kept.map((k) => k.id))
    const removed = current.filter((row) => !keptIds.has(row.id))
    await deleteProjectImageRows(removed.map((r) => r.id))
    await removeProjectImageFiles(removed.map((r) => r.path)).catch(() => {})
    return project
  } catch (e) {
    if (!linked) await removeProjectImageFiles(uploaded).catch(() => {})
    throw e
  }
}

/** What the admin table shows: no long texts. */
export type AdminProject = Pick<Project, 'id' | 'name' | 'status' | 'country' | 'region' | 'created_by' | 'updated_at'>

/** Every project by name, for the admin table (the catalog is small: no paging). */
export async function listAdminProjects(): Promise<AdminProject[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, name, status, country, region, created_by, updated_at')
    .order('name')
    .order('id')
  if (error) throw error
  return data as AdminProject[]
}

/** Gives a project an owner (or none). Admins only: the database checks. */
export async function assignProjectCreator(id: string, userId: string | null): Promise<void> {
  const { data, error } = await supabase.from(TABLE).update({ created_by: userId }).eq('id', id).select('id')
  if (error) throw error
  if (!data || data.length === 0) throw new Error('No se pudo asignar el creador')
}

/** Deletes a project and its photos (the rows go with it; the files are removed afterwards). */
export async function deleteProjectWithImages(id: string): Promise<void> {
  const paths = (await listProjectImages(id)).map((i) => i.path)
  await deleteProject(id)
  if (paths.length > 0) await removeProjectImageFiles(paths).catch(() => {})
}
