import { useTranslation } from 'react-i18next'

interface Props {
  onClick: () => void
  /** Without a recipient: stays visible and focusable, but does nothing. Say why in `title`. */
  unavailable?: boolean
  title?: string
  className?: string
}

/** Round chat icon that starts a message to the project's contact. Same look as the heart and edit icons. */
export default function SendMessageButton({ onClick, unavailable = false, title, className = '' }: Props) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      aria-label={t('message.send')}
      aria-disabled={unavailable}
      title={title ?? t('message.send')}
      onClick={unavailable ? undefined : onClick}
      className={`inline-flex size-10 items-center justify-center rounded-full bg-white text-brand-primary ring-1 ring-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage ${
        unavailable ? 'cursor-not-allowed opacity-60' : 'hover:bg-brand-blush'
      } ${className}`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    </button>
  )
}
