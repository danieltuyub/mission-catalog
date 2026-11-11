import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import { accumulateZoom } from './wheelZoom'

const LINE_HEIGHT_PX = 16

/**
 * Two-finger scroll pans the map; pinch (ctrl+wheel) or Cmd/Ctrl + wheel zooms.
 * Requires scrollWheelZoom={false} on the MapContainer.
 */
export default function TrackpadNavigation() {
  const map = useMap()

  useEffect(() => {
    const el = map.getContainer()
    let acc = 0

    // MapContainer options are only read at creation; make sure Leaflet's own wheel zoom is off.
    map.scrollWheelZoom.disable()

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const px = e.deltaMode === 1 ? LINE_HEIGHT_PX : 1

      if (e.ctrlKey || e.metaKey) {
        const next = accumulateZoom(acc, e.deltaY * px)
        acc = next.acc
        if (next.steps) {
          map.setZoomAround(map.mouseEventToContainerPoint(e), map.getZoom() + next.steps)
        }
      } else {
        map.panBy([e.deltaX * px, e.deltaY * px], { animate: false })
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [map])

  return null
}
