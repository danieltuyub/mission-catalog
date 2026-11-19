import { describe, expect, it } from 'vitest'
import { resources } from './index'

/** Plural forms differ by language (English has no extra ones here), so compare the base key. */
const keys = (value: unknown, prefix = ''): string[] =>
  typeof value === 'object' && value !== null
    ? Object.entries(value).flatMap(([k, v]) => keys(v, `${prefix}${prefix ? '.' : ''}${k.replace(/_(one|other)$/, '')}`))
    : [prefix]

describe('locales', () => {
  it.each(Object.keys(resources.es) as (keyof typeof resources.es)[])('English has the same keys as Spanish in "%s"', (ns) => {
    const es = new Set(keys(resources.es[ns]))
    const en = new Set(keys(resources.en[ns]))
    expect([...es].filter((k) => !en.has(k))).toEqual([])
    expect([...en].filter((k) => !es.has(k))).toEqual([])
  })
})
