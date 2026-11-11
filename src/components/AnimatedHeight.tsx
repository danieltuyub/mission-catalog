import { useEffect, useRef, useState, type ReactNode } from 'react'

// Room kept around the content so shadows/rings are not clipped by overflow-hidden.
const GUTTER = 8

export default function AnimatedHeight({ children }: { children: ReactNode }) {
  const innerRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | undefined>(undefined)

  useEffect(() => {
    const el = innerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) =>
      setHeight(entry.borderBoxSize?.[0]?.blockSize ?? el.offsetHeight),
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      style={height === undefined ? undefined : { height: height + GUTTER * 2 }}
      className="-m-2 overflow-hidden p-2 transition-[height] duration-250 ease-out motion-reduce:transition-none"
    >
      <div ref={innerRef}>{children}</div>
    </div>
  )
}
