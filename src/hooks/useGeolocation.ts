import type { LatLngTuple } from 'leaflet'
import { useEffect, useState } from 'react'

export type GeoStatus = 'loading' | 'granted' | 'denied' | 'unavailable' | 'unsupported'

interface GeoState {
  status: GeoStatus
  position: LatLngTuple | null
}

const supported = typeof navigator !== 'undefined' && 'geolocation' in navigator

export function useGeolocation(): GeoState {
  const [state, setState] = useState<GeoState>({
    status: supported ? 'loading' : 'unsupported',
    position: null,
  })

  useEffect(() => {
    if (!supported) return

    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        setState({ status: 'granted', position: [coords.latitude, coords.longitude] }),
      (err) =>
        setState({
          status: err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable',
          position: null,
        }),
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }, [])

  return state
}
