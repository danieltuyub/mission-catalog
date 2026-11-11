import { useEffect, useState } from 'react'
import { getProjects, type ProjectsPage } from '../services/projectService'

interface Result {
  page: number
  data?: ProjectsPage
  error?: string
}

export function useProjects(page = 1) {
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    let cancelled = false
    getProjects(page)
      .then((data) => !cancelled && setResult({ page, data }))
      .catch(
        (e: unknown) =>
          !cancelled &&
          setResult({ page, error: e instanceof Error ? e.message : 'Failed to load projects' }),
      )
    return () => {
      cancelled = true
    }
  }, [page])

  const current = result?.page === page ? result : null
  return {
    projects: current?.data?.data ?? [],
    pagination: current?.data ?? null,
    error: current?.error ?? null,
    loading: current === null,
  }
}
