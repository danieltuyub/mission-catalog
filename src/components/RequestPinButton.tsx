interface Props {
  /** True while the user is choosing the location on the map. */
  active: boolean
  onToggle: () => void
}

/** Map button for people who cannot create pins: starts (or cancels) choosing a spot for a request. */
export default function RequestPinButton({ active, onToggle }: Props) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className={`absolute bottom-6 left-4 z-[1000] inline-flex h-10 items-center gap-2 rounded-full pl-3 pr-4 text-sm font-medium shadow-md ring-1 ring-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage ${
        active ? 'bg-brand-primary text-brand-blush hover:bg-brand-primary/90' : 'bg-white text-brand-primary hover:bg-brand-blush'
      }`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {active ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z M12 7v6M9 10h6" />}
      </svg>
      {active ? 'Cancelar' : 'Solicitar pin'}
    </button>
  )
}
