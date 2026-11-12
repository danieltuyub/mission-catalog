import { useEffect, useState } from 'react'
import { getProjectFilterOptions, type FilterOptions } from '../services/projectService'

export function useFilterOptions() {
  const [options, setOptions] = useState<FilterOptions | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getProjectFilterOptions()
      .then((data) => !cancelled && setOptions(data))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load filters'))
    return () => {
      cancelled = true
    }
  }, [])

  return { options, error, loading: options === null && error === null }
}
