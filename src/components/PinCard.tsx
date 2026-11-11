import type { Pin } from '../types'

interface Props {
  pin: Pin
  onClose: () => void
}

export default function PinCard({ pin, onClose }: Props) {
  return (
    <aside
      aria-label="Detalle del pin"
      className="absolute right-4 top-4 z-[1000] max-h-[calc(100%-2rem)] w-80 max-w-[calc(100%-2rem)] overflow-y-auto rounded-xl bg-white p-4 shadow-xl ring-1 ring-black/5"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-brand-primary">{pin.title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="-mr-1 -mt-1 rounded-full px-2 text-xl leading-8 text-gray-500 hover:bg-brand-blush/60 hover:text-brand-primary"
        >
          ×
        </button>
      </div>

      <div className="mt-3 flex h-36 items-center justify-center rounded-lg border border-dashed border-brand-sage/70 bg-brand-blush/30 text-sm text-brand-primary/60">
        Foto
      </div>

      <p className="mt-3 text-sm text-gray-700">{pin.description || 'Sin descripción'}</p>
    </aside>
  )
}
