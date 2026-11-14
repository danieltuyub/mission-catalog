import { supabase } from './supabaseClient'

const TABLE = 'saved_projects'
const UNIQUE_VIOLATION = '23505'

/** Ids of the projects the signed-in user saved (row level security limits the rows to their own). */
export async function listSavedProjectIds(): Promise<string[]> {
  const { data, error } = await supabase.from(TABLE).select('project_id')
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => row.project_id as string)
}

/** Saving twice is not an error: the project is saved either way. */
export async function saveProject(projectId: string): Promise<void> {
  const { error } = await supabase.from(TABLE).insert({ project_id: projectId })
  if (error && error.code !== UNIQUE_VIOLATION) throw new Error(error.message)
}

export async function unsaveProject(projectId: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('project_id', projectId)
  if (error) throw new Error(error.message)
}
