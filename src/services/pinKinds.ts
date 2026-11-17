import type { PinKind } from '../types'

export const PIN_KINDS: readonly { id: PinKind; label: string }[] = [
  { id: 'person', label: 'Persona' },
  { id: 'family', label: 'Familia' },
  { id: 'house_church', label: 'Iglesia en casa' },
  { id: 'church', label: 'Iglesia' },
]

export const kindLabel = (kind: PinKind | null) => PIN_KINDS.find((k) => k.id === kind)?.label ?? ''

export const isPinKind = (value: string): value is PinKind => PIN_KINDS.some((k) => k.id === value)
