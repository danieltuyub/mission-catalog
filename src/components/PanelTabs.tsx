import type { ReactNode } from 'react'

interface Props {
  label: string
  /** Tabs link to `#/<base>/<id>`. */
  base: string
  tabs: readonly { id: string; label: string; badge?: ReactNode }[]
  current: string
}

/** Underlined tabs of a panel (the pills are for the choices inside a section). Scrolls sideways on narrow screens. */
export default function PanelTabs({ label, base, tabs, current }: Props) {
  return (
    <nav aria-label={label} className="mb-6 overflow-x-auto border-b border-stone-200">
      <ul className="flex w-max gap-6">
        {tabs.map(({ id, label: text, badge }) => {
          const active = id === current
          return (
            <li key={id}>
              <a
                href={`#/${base}/${id}`}
                aria-current={active ? 'page' : undefined}
                className={`-mb-px inline-flex h-11 items-center gap-2 border-b-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-sage ${
                  active
                    ? 'border-brand-primary font-medium text-brand-primary'
                    : 'border-transparent text-stone-500 hover:border-stone-300 hover:text-brand-primary'
                }`}
              >
                {text}
                {badge}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
