import i18n from '../i18n'
import type { PinKind } from '../types'

/** The kinds of pin, in display order. Their names come from the translations (`kind.<id>`). */
export const PIN_KINDS: readonly { id: PinKind }[] = [{ id: 'person' }, { id: 'family' }, { id: 'house_church' }, { id: 'church' }]

export const kindLabel = (kind: PinKind | null) => (kind ? i18n.t(`map:kind.${kind}`) : '')

export const isPinKind = (value: string): value is PinKind => PIN_KINDS.some((k) => k.id === value)
