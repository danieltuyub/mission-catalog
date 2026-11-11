import { useEffect, useState } from 'react'
import {
  DEFAULT_DIRECTION,
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORT,
  getProjects,
  type ProjectSort,
  type SortDirection,
  type ProjectsPage,
} from '../services/projectService'

interface Result {
  page: number
  pageSize: number
  sort: ProjectSort
  direction: SortDirection
  data?: ProjectsPage
  error?: string
}

export function useProjects(
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  sort: ProjectSort = DEFAULT_SORT,
  direction: SortDirection = DEFAULT_DIRECTION[sort],
) {
  const [result, setResult] = useState<Result | null>(null)
  const [latest, setLatest] = useState<ProjectsPage | null>(null)

  useEffect(() => {
    let cancelled = false
    getProjects(page, pageSize, sort, direction)
      .then((data) => {
        if (cancelled) return
        setLatest(data)
        setResult({ page, pageSize, sort, direction, data })
      })
      .catch(
        (e: unknown) =>
          !cancelled &&
          setResult({ page, pageSize, sort, direction, error: e instanceof Error ? e.message : 'Failed to load projects' }),
      )
    return () => {
      cancelled = true
    }
  }, [page, pageSize, sort, direction])

  const current = result?.page === page && result.pageSize === pageSize && result.sort === sort && result.direction === direction
      ? result
      : null
  // Keep the previous page's data on screen while the next one loads.
  return {
    projects: latest?.data ?? [],
    pagination: latest,
    error: current?.error ?? null,
    loading: current === null,
  }
}
