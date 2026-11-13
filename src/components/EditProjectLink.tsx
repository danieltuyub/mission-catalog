import { editUrl, type EditOrigin } from '../services/editOrigin'

interface Props {
  id: string
  /** Tells the edit page where to return to. */
  from?: EditOrigin
  className?: string
}

/** Round pencil icon that opens the project's edit page. Position it with `className`. */
export default function EditProjectLink({ id, from, className = '' }: Props) {
  return (
    <a
      href={editUrl(id, from)}
      aria-label="Editar proyecto"
      title="Editar proyecto"
      className={`inline-flex size-10 items-center justify-center rounded-full bg-white text-brand-primary ring-1 ring-black/5 hover:bg-brand-blush focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage ${className}`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
      </svg>
    </a>
  )
}
