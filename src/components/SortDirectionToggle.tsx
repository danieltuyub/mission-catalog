import type { SortDirection } from '../services/projectService'

interface Props {
  value: SortDirection
  onChange: (value: SortDirection) => void
}

const ARROW: Record<SortDirection, { label: string; path: string }> = {
  asc: { label: 'Orden ascendente', path: 'M12 19V5M5 12l7-7 7 7' },
  desc: { label: 'Orden descendente', path: 'M12 5v14M19 12l-7 7-7-7' },
}

export default function SortDirectionToggle({ value, onChange }: Props) {
  const { label, path } = ARROW[value]
  const next: SortDirection = value === 'asc' ? 'desc' : 'asc'

  return (
    <button
      type="button"
      aria-label={label}
      title={`${label} (clic para cambiar)`}
      onClick={() => onChange(next)}
      className="flex size-10 items-center justify-center rounded-full bg-white text-brand-primary ring-1 ring-black/5 transition-colors hover:bg-brand-blush focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={path} />
      </svg>
    </button>
  )
}
