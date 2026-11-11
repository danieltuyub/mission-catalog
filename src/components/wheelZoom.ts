export const ZOOM_THRESHOLD = 80

/** Accumulates wheel delta into whole zoom steps (negative deltaY = zoom in). */
export function accumulateZoom(acc: number, deltaY: number, threshold = ZOOM_THRESHOLD) {
  const total = acc + deltaY
  return { steps: 0 - Math.trunc(total / threshold), acc: total % threshold }
}
