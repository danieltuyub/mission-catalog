import { useEffect, useState } from 'react'
import {
  DEFAULT_DIRECTION,
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORT,
  getProjects,
  type GetProjectsOptions,
  type ProjectsPage,
} from '../services/projectService'

interface Result {
  key: string
  data?: ProjectsPage
  error?: string
}

export function useProjects(options: GetProjectsOptions = {}) {
  const sort = options.sort ?? DEFAULT_SORT
  const key = JSON.stringify({
    page: options.page ?? 1,
    pageSize: options.pageSize ?? DEFAULT_PAGE_SIZE,
    sort,
    direction: options.direction ?? DEFAULT_DIRECTION[sort],
    filters: options.filters ?? {},
  })

  const [result, setResult] = useState<Result | null>(null)
  const [latest, setLatest] = useState<ProjectsPage | null>(null)

  useEffect(() => {
    let cancelled = false
    getProjects(JSON.parse(key) as GetProjectsOptions)
      .then((data) => {
        if (cancelled) return
        setLatest(data)
        setResult({ key, data })
      })
      .catch(
        (e: unknown) =>
          !cancelled &&
          setResult({ key, error: e instanceof Error ? e.message : 'Failed to load projects' }),
      )
    return () => {
      cancelled = true
    }
  }, [key])

  const current = result?.key === key ? result : null
  // Keep the previous results on screen while the next ones load.
  return {
    projects: latest?.data ?? [],
    pagination: latest,
    error: current?.error ?? null,
    loading: current === null,
  }
}
