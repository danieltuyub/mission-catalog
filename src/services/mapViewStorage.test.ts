import { beforeEach, describe, expect, it } from 'vitest'
import { clearMapView, loadMapView, saveMapView } from './mapViewStorage'

beforeEach(clearMapView)

describe('mapViewStorage', () => {
  it('returns null when nothing is saved', () => {
    expect(loadMapView()).toBeNull()
  })

  it('round-trips a saved view', () => {
    saveMapView({ center: [10.5, -20.25], zoom: 12 })
    expect(loadMapView()).toEqual({ center: [10.5, -20.25], zoom: 12 })
  })
})
