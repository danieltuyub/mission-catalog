import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { ProjectStatus } from '../types'

export const STATUS_ORDER: readonly ProjectStatus[] = ['open', 'paused', 'closed']

export const STATUS_META: Record<ProjectStatus, { chip: string; dot: string }> = {
  open: { chip: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
  paused: { chip: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-400' },
  closed: { chip: 'bg-red-100 text-red-800', dot: 'bg-red-500' },
}

/** The name of a status in the current language. */
export function useStatusLabel(): (status: ProjectStatus) => string {
  const { t } = useTranslation()
  return useCallback((status) => t(`status.${status}`), [t])
}
