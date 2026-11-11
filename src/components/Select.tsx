import type { ReactNode } from 'react'

export interface SelectOption {
  value: string
  label: string
}

interface Props {
  label: string
  value: string
  options: readonly SelectOption[]
  onChange: (value: string) => void
  /** Path data(s) for a 24x24 stroke icon shown on the left. */
  icon: ReactNode
}

export default function Select({ label, value, options, onChange, icon }: Props) {
  return (
    <div className="relative" title={label}>
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 stroke-brand-primary"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {icon}
      </svg>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 cursor-pointer appearance-none rounded-full bg-white pl-10 pr-9 text-sm text-brand-primary ring-1 ring-black/5 transition-colors hover:bg-brand-blush focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 stroke-brand-primary"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  )
}
