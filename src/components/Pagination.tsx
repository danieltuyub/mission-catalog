import { getPageWindow } from './pageWindow'

interface Props {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

export default function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null

  return (
    <nav aria-label="Paginación">
      <ul className="flex items-center gap-2">
        {getPageWindow(page, totalPages).map((p) => (
          <li key={p}>
            <button
              type="button"
              onClick={() => onChange(p)}
              aria-label={`Página ${p}`}
              aria-current={p === page ? 'page' : undefined}
              className={`size-10 rounded-full text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage ${
                p === page
                  ? 'bg-brand-primary font-medium text-brand-blush'
                  : 'bg-white text-brand-primary ring-1 ring-black/5 hover:bg-brand-blush'
              }`}
            >
              {p}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
