import type { ProjectStatus } from '../types'

export const STATUS_ORDER: readonly ProjectStatus[] = ['open', 'paused', 'closed']

export const STATUS_META: Record<ProjectStatus, { label: string; chip: string; dot: string }> = {
  open: { label: 'Abierto', chip: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
  paused: { label: 'Pausado', chip: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-400' },
  closed: { label: 'Cerrado', chip: 'bg-red-100 text-red-800', dot: 'bg-red-500' },
}
