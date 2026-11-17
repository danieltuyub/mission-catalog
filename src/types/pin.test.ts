import { describe, expectTypeOf, it } from 'vitest'
import type { Pin } from './pin'

describe('Pin type', () => {
  it('has the expected shape', () => {
    expectTypeOf<Pin>().toEqualTypeOf<{
      id: string
      title: string
      description: string
      lat: number
      lng: number
      created_at: string
      image_path: string | null
      country: string
      region: string
      city: string
      languages: string[]
      kind: 'person' | 'family' | 'house_church' | 'church' | null
    }>()
  })
})
