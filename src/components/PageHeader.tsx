import type { ReactNode, Ref } from 'react'

interface Props {
  title: string
  /** Small element next to the title (e.g. a count). */
  badge?: ReactNode
  /** Controls aligned to the right; wraps below the title when there is no room. */
  children?: ReactNode
  ref?: Ref<HTMLDivElement>
}

export default function PageHeader({ title, badge, children, ref }: Props) {
  return (
    <div
      ref={ref}
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 pb-5"
    >
      <div className="flex items-center gap-2.5">
        <h1 className="text-2xl font-semibold tracking-tight text-brand-primary">{title}</h1>
        {badge}
      </div>
      {children}
    </div>
  )
}
