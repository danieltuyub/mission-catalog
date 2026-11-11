import type { Route } from '../hooks/useRoute'

const LINKS: { route: Route; label: string }[] = [
  { route: 'mapa', label: 'Mapa' },
  { route: 'proyectos', label: 'Proyectos' },
  { route: 'contacto', label: 'Contacto' },
]

export default function Navbar({ current }: { current: Route }) {
  return (
    <header className="sticky top-0 z-[3000] flex justify-center bg-white/90 py-3 backdrop-blur">
      <nav
        aria-label="Principal"
        className="flex w-[94%] items-center justify-between rounded-full bg-brand-lime/25 px-5 py-2 ring-1 ring-brand-moss/30 md:w-4/5"
      >
        <a href="#/mapa" className="font-semibold text-gray-900">
          Mission Catalog
        </a>
        <ul className="flex gap-1">
          {LINKS.map(({ route, label }) => (
            <li key={route}>
              <a
                href={`#/${route}`}
                aria-current={current === route ? 'page' : undefined}
                className={`rounded-full px-4 py-1.5 text-sm text-gray-900 transition-colors ${
                  current === route ? 'bg-brand-lime font-medium' : 'hover:bg-brand-mint/50'
                }`}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
