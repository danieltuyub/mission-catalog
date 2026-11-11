import type { LatLngTuple } from 'leaflet'
import { useCallback, useEffect, useState } from 'react'

export type GeoStatus = 'loading' | 'granted' | 'denied' | 'unavailable' | 'unsupported'

interface GeoState {
  status: GeoStatus
  position: LatLngTuple | null
}

const supported = typeof navigator !== 'undefined' && 'geolocation' in navigator

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({
    status: supported ? 'loading' : 'unsupported',
    position: null,
  })

  /** Requests a fresh position. Resolves with it, or null if it could not be obtained. */
  const locate = useCallback(
    () =>
      new Promise<LatLngTuple | null>((resolve) => {
        if (!supported) return resolve(null)

        navigator.geolocation.getCurrentPosition(
          ({ coords }) => {
            const position: LatLngTuple = [coords.latitude, coords.longitude]
            setState({ status: 'granted', position })
            resolve(position)
          },
          (err) => {
            const status = err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable'
            setState((prev) => ({ ...prev, status }))
            resolve(null)
          },
          { enableHighAccuracy: true, timeout: 10_000 },
        )
      }),
    [],
  )

  useEffect(() => {
    void locate()
  }, [locate])

  return { ...state, locate }
}
