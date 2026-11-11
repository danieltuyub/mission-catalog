interface Props {
  value: number
  options: readonly number[]
  onChange: (size: number) => void
}

export default function PageSizeSelect({ value, options, onChange }: Props) {
  return (
    <div className="relative">
      <select
        aria-label="Proyectos por página"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-10 cursor-pointer appearance-none rounded-full bg-white pl-4 pr-9 text-sm text-brand-primary ring-1 ring-black/5 transition-colors hover:bg-brand-blush focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage"
      >
        {options.map((n) => (
          <option key={n} value={n}>
            {n} por página
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
