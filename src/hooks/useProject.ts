import { useEffect, useState } from 'react'
import { can } from '../services/permissions'
import { getProjectById } from '../services/projectService'
import type { Project } from '../types'
import { useAuth } from './useAuth'

interface Result {
  key: string
  project: Project | null
  error: string | null
}

/** Loads a project; members get every column, guests only the summary. */
export function useProject(id: string) {
  const auth = useAuth()
  const full = can(auth, 'projects.view_detail')
  const [result, setResult] = useState<Result | null>(null)
  const key = `${id}:${full}`

  useEffect(() => {
    // Wait for the session: the right query depends on who is looking.
    if (auth.loading) return
    let cancelled = false
    getProjectById(id, full)
      .then((project) => !cancelled && setResult({ key, project, error: null }))
      .catch(
        (e: unknown) =>
          !cancelled &&
          setResult({
            key,
            project: null,
            error: e instanceof Error ? e.message : 'Failed to load project',
          }),
      )
    return () => {
      cancelled = true
    }
  }, [id, full, key, auth.loading])

  const current = !auth.loading && result?.key === key ? result : null
  return {
    project: current?.project ?? null,
    error: current?.error ?? null,
    loading: current === null,
    /** Whether the loaded data includes the members-only fields. */
    full,
  }
}
