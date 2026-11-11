import type { LatLngTuple } from 'leaflet'

export interface MapViewState {
  center: LatLngTuple
  zoom: number
}

// In-memory on purpose: survives menu navigation, resets on page reload.
let current: MapViewState | null = null

export function loadMapView(): MapViewState | null {
  return current
}

export function saveMapView(view: MapViewState): void {
  current = view
}

export function clearMapView(): void {
  current = null
}
