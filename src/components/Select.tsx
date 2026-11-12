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
  icon?: ReactNode
  /** No own background/border, to be embedded inside another pill. */
  bare?: boolean
}

export default function Select({ label, value, options, onChange, icon, bare = false }: Props) {
  return (
    <div className="relative" title={label}>
      {icon && (
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
      )}
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`cursor-pointer appearance-none rounded-full text-sm text-brand-primary transition-colors focus-visible:outline-2 focus-visible:outline-brand-sage ${
          bare
            ? 'h-8 pl-3 pr-8 hover:bg-brand-blush/70 focus-visible:outline-offset-1'
            : 'h-10 bg-white pr-9 ring-1 ring-black/5 hover:bg-brand-blush focus-visible:outline-offset-2 ' +
              (icon ? 'pl-10' : 'pl-4')
        }`}
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
        className={`pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 stroke-brand-primary ${
          bare ? 'right-2.5' : 'right-3'
        }`}
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
