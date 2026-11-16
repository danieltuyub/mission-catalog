import { shareProject } from '../services/shareProject'
import { showToast } from '../services/toast'

interface Props {
  id: string
  name: string
  className?: string
}

/** Round share icon: opens the system share sheet, or copies the link. Same look as the heart and edit icons. */
export default function ShareProjectButton({ id, name, className = '' }: Props) {
  async function share() {
    const result = await shareProject(id, name)
    if (result === 'copied') showToast('Enlace copiado')
    else if (result === 'failed') showToast('No se pudo compartir el proyecto')
  }

  return (
    <button
      type="button"
      aria-label="Compartir proyecto"
      title="Compartir proyecto"
      onClick={share}
      className={`inline-flex size-10 items-center justify-center rounded-full bg-white text-brand-primary ring-1 ring-black/5 hover:bg-brand-blush focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage ${className}`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4-4 4M12 2v13" />
      </svg>
    </button>
  )
}
