import { useState, type KeyboardEvent } from 'react'

export interface Photo {
  src: string
  alt: string
}

interface Props {
  /** Real photos. When empty, `placeholders` empty slides are shown. */
  photos?: Photo[]
  placeholders?: number
  label?: string
}

const Icon = ({ className }: { className: string }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="8.5" cy="9.5" r="1.5" />
    <path d="M21 16l-5-5-8 8" />
  </svg>
)

const Arrow = ({ dir }: { dir: 'prev' | 'next' }) => (
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
    <path d={dir === 'prev' ? 'M15 18l-6-6 6-6' : 'M9 6l6 6-6 6'} />
  </svg>
)

const navButton =
  'absolute top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-brand-primary shadow hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage'

export default function PhotoCarousel({ photos = [], placeholders = 3, label = 'Fotos del proyecto' }: Props) {
  const count = photos.length > 0 ? photos.length : placeholders
  const [index, setIndex] = useState(0)

  const wrap = (i: number) => ((i % count) + count) % count
  const go = (next: number) => setIndex(wrap(next))
  const move = (delta: number) => setIndex((i) => wrap(i + delta))

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') move(-1)
    else if (e.key === 'ArrowRight') move(1)
  }

  return (
    <section aria-roledescription="carousel" aria-label={label} onKeyDown={onKeyDown}>
      <div className="relative aspect-4/3 overflow-hidden rounded-xl bg-stone-200">
        <div
          className="flex h-full transition-transform duration-300 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {Array.from({ length: count }, (_, i) => (
            <div
              key={i}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} de ${count}`}
              aria-hidden={i !== index}
              className={`flex h-full w-full shrink-0 items-center justify-center text-stone-400 ${
                i % 2 === 0 ? 'bg-stone-200' : 'bg-stone-300/70'
              }`}
            >
              {photos[i] ? (
                <img src={photos[i].src} alt={photos[i].alt} className="size-full object-cover" />
              ) : (
                <Icon className="size-14" />
              )}
            </div>
          ))}
        </div>

        {count > 1 && (
          <>
            <button type="button" aria-label="Foto anterior" onClick={() => move(-1)} className={`${navButton} left-3`}>
              <Arrow dir="prev" />
            </button>
            <button type="button" aria-label="Foto siguiente" onClick={() => move(1)} className={`${navButton} right-3`}>
              <Arrow dir="next" />
            </button>
            <p
              aria-hidden="true"
              className="absolute bottom-3 right-3 rounded-full bg-brand-primary/70 px-2.5 py-0.5 text-xs text-white"
            >
              {index + 1} / {count}
            </p>
          </>
        )}
      </div>

      {count > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto p-1">
          {Array.from({ length: count }, (_, i) => (
            <li key={i} className="shrink-0">
              <button
                type="button"
                aria-label={`Ir a la foto ${i + 1}`}
                aria-current={i === index ? 'true' : undefined}
                onClick={() => go(i)}
                className={`flex h-14 w-20 items-center justify-center overflow-hidden rounded-lg text-stone-400 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-sage ${
                  i % 2 === 0 ? 'bg-stone-200' : 'bg-stone-300/70'
                } ${i === index ? 'ring-2 ring-brand-primary' : 'opacity-70 hover:opacity-100'}`}
              >
                {photos[i] ? (
                  <img src={photos[i].src} alt="" className="size-full object-cover" />
                ) : (
                  <Icon className="size-6" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
