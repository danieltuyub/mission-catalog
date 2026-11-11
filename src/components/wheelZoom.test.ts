import { describe, expect, it } from 'vitest'
import { accumulateZoom } from './wheelZoom'

describe('accumulateZoom', () => {
  it('does not step below the threshold and keeps the remainder', () => {
    expect(accumulateZoom(0, -30)).toEqual({ steps: 0, acc: -30 })
  })

  it('zooms in on negative delta once the threshold is crossed', () => {
    expect(accumulateZoom(-50, -40)).toEqual({ steps: 1, acc: -10 })
  })

  it('zooms out on positive delta', () => {
    expect(accumulateZoom(0, 100)).toEqual({ steps: -1, acc: 20 })
  })

  it('handles several steps at once', () => {
    expect(accumulateZoom(0, -250).steps).toBe(3)
  })
})
