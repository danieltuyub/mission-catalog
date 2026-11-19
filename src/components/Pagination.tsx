import { useTranslation } from 'react-i18next'
import { getPageWindow } from './pageWindow'

interface Props {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

const ARROWS = {
  first: { path: 'M11 17l-5-5 5-5M18 17l-5-5 5-5' },
  prev: { path: 'M15 18l-6-6 6-6' },
  next: { path: 'M9 6l6 6-6 6' },
  last: { path: 'M13 17l5-5-5-5M6 17l5-5-5-5' },
}

const BASE =
  'flex size-8 items-center justify-center rounded-full text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-sage'

function ArrowButton({
  kind,
  disabled,
  onClick,
  className = '',
}: {
  kind: keyof typeof ARROWS
  disabled: boolean
  onClick: () => void
  className?: string
}) {
  const { t } = useTranslation()
  const { path } = ARROWS[kind]
  const label = t(`pagination.${kind}`)
  return (
    <li className={className}>
      <button
        type="button"
        aria-label={label}
        title={label}
        disabled={disabled}
        onClick={onClick}
        className={`${BASE} text-brand-primary enabled:hover:bg-brand-blush/70 disabled:opacity-30`}
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
    </li>
  )
}

export default function Pagination({ page, totalPages, onChange }: Props) {
  const { t } = useTranslation()
  if (totalPages <= 1) return null

  const atStart = page <= 1
  const atEnd = page >= totalPages

  return (
    <nav aria-label={t('pagination.label')}>
      <ul className="flex h-10 items-center gap-0.5 rounded-full bg-white p-1 ring-1 ring-black/5">
        {/* First/last are hidden on small screens to save width. */}
        <ArrowButton kind="first" disabled={atStart} onClick={() => onChange(1)} className="hidden sm:block" />
        <ArrowButton kind="prev" disabled={atStart} onClick={() => onChange(page - 1)} />
        {getPageWindow(page, totalPages).map((p) => (
          <li key={p}>
            <button
              type="button"
              onClick={() => onChange(p)}
              aria-label={t('pagination.page', { page: p })}
              aria-current={p === page ? 'page' : undefined}
              className={`${BASE} ${
                p === page
                  ? 'bg-brand-primary font-medium text-brand-blush'
                  : 'text-brand-primary hover:bg-brand-blush/70'
              }`}
            >
              {p}
            </button>
          </li>
        ))}
        <ArrowButton kind="next" disabled={atEnd} onClick={() => onChange(page + 1)} />
        <ArrowButton kind="last" disabled={atEnd} onClick={() => onChange(totalPages)} className="hidden sm:block" />
      </ul>
    </nav>
  )
}
