import { useEffect, useState } from 'react'
import { getProjectById } from '../services/projectService'
import type { Project } from '../types'

interface Result {
  id: string
  project: Project | null
  error: string | null
}

export function useProject(id: string) {
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    let cancelled = false
    getProjectById(id)
      .then((project) => !cancelled && setResult({ id, project, error: null }))
      .catch(
        (e: unknown) =>
          !cancelled &&
          setResult({
            id,
            project: null,
            error: e instanceof Error ? e.message : 'Failed to load project',
          }),
      )
    return () => {
      cancelled = true
    }
  }, [id])

  const current = result?.id === id ? result : null
  return {
    project: current?.project ?? null,
    error: current?.error ?? null,
    loading: current === null,
  }
}
