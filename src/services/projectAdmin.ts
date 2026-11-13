import type { Project } from '../types'
import { insertProjectImages, removeProjectImageFiles, uploadProjectImage } from './projectImages'
import { supabase } from './supabaseClient'

const TABLE = 'projects'

export type NewProject = Pick<Project, 'name'> &
  Partial<
    Pick<Project, 'responsible' | 'description' | 'details' | 'started_at' | 'country' | 'region' | 'phone' | 'mail' | 'status'>
  >

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
