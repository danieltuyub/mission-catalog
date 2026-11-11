import { useEffect, useState } from 'react'
import { DEFAULT_PAGE_SIZE, getProjects, type ProjectsPage } from '../services/projectService'

interface Result {
  page: number
  pageSize: number
  data?: ProjectsPage
  error?: string
}

export function useProjects(page = 1, pageSize = DEFAULT_PAGE_SIZE) {
  const [result, setResult] = useState<Result | null>(null)
  const [latest, setLatest] = useState<ProjectsPage | null>(null)

  useEffect(() => {
    let cancelled = false
    getProjects(page, pageSize)
      .then((data) => {
        if (cancelled) return
        setLatest(data)
        setResult({ page, pageSize, data })
      })
      .catch(
        (e: unknown) =>
          !cancelled &&
          setResult({ page, pageSize, error: e instanceof Error ? e.message : 'Failed to load projects' }),
      )
    return () => {
      cancelled = true
    }
  }, [page, pageSize])

  const current = result?.page === page && result.pageSize === pageSize ? result : null
  // Keep the previous page's data on screen while the next one loads.
  return {
    projects: latest?.data ?? [],
    pagination: latest,
    error: current?.error ?? null,
    loading: current === null,
  }
}
