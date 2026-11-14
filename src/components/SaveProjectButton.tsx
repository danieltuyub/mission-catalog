interface Props {
  saved: boolean
  onToggle: () => void
  /** While the session or the saved marks are still loading. */
  disabled?: boolean
  className?: string
}

/** Round heart icon that saves or unsaves a project. Same look as the edit icon; position it with `className`. */
export default function SaveProjectButton({ saved, onToggle, disabled = false, className = '' }: Props) {
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label="Guardar proyecto"
      title={saved ? 'Quitar de guardados' : 'Guardar proyecto'}
      disabled={disabled}
      onClick={onToggle}
      className={`inline-flex size-10 items-center justify-center rounded-full bg-white text-brand-primary ring-1 ring-black/5 hover:bg-brand-blush focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage disabled:cursor-wait disabled:opacity-60 disabled:hover:bg-white ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={`size-4 ${saved ? 'text-rose-600' : ''}`}
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
    </button>
  )
}
