import { beforeEach, describe, expect, it, vi } from 'vitest'

const sb = vi.hoisted(() => ({ selects: [] as string[] }))
vi.mock('./supabaseClient', () => ({
  supabase: {
    from: () => {
      const builder: Record<string, unknown> = {
        then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve),
        single: () => Promise.resolve({ data: {}, error: null }),
      }
      for (const m of ['select', 'order', 'insert', 'update', 'eq']) {
        builder[m] = (arg?: string) => {
          if (m === 'select') sb.selects.push(arg ?? '*')
          return builder
        }
      }
      return builder
    },
  },
}))

import { createPin, getPins, PIN_COLUMNS, updatePin } from './pinService'

beforeEach(() => {
  sb.selects.length = 0
})

describe('pin columns', () => {
  it('never ask for the exact place, which is private', () => {
    expect(PIN_COLUMNS).not.toMatch(/exact/)
    expect(PIN_COLUMNS.split(', ')).toEqual(expect.arrayContaining(['id', 'lat', 'lng', 'country', 'languages', 'kind']))
  })

  it('every read and every write that returns the pin names them (a `select *` would be refused)', async () => {
    await getPins()
    await createPin({ title: 'a', lat: 1, lng: 2 })
    await updatePin('1', { title: 'b' })
    expect(sb.selects).toEqual([PIN_COLUMNS, PIN_COLUMNS, PIN_COLUMNS])
  })
})
