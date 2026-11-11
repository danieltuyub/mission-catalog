const LINKS = [
  { href: '#/mapa', label: 'Mapa' },
  { href: '#/proyectos', label: 'Proyectos' },
  { href: '#/contacto', label: 'Contacto' },
]

const YEAR = new Date().getFullYear()

export default function Footer() {
  return (
    <footer className="pb-5 pt-5">
      <div className="mx-auto w-[94%] rounded-3xl bg-brand-primary px-6 py-14 text-brand-blush md:w-4/5 md:px-12 md:py-16">
        <div className="text-center">
          <p className="mx-auto max-w-2xl text-lg leading-relaxed">
            Si quieres más información sobre las iglesias en casa, o de algún proyecto en
            particular, ponte en contacto con nosotros
          </p>
          <a
            href="#/contacto"
            className="mt-8 inline-block rounded-full bg-brand-blush px-6 py-2 text-sm font-medium text-brand-primary transition-colors hover:bg-brand-sage"
          >
            Contáctanos
          </a>
        </div>

        <div className="mt-14 grid gap-10 border-t border-white/10 pt-10 text-center text-sm md:grid-cols-3 md:text-left">
          <div>
            <p className="font-medium text-white">Mission Catalog</p>
            <p className="mt-2 max-w-xs text-brand-blush/70 md:max-w-none">
              Un mapa de las iglesias en casa y proyectos misioneros.
            </p>
          </div>

          <nav aria-label="Pie de página" className="md:justify-self-center">
            <ul className="space-y-2">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="text-brand-blush/70 transition-colors hover:text-white">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="md:justify-self-end md:text-right">
            <a
              href="mailto:hey@danieltuyub.com"
              className="text-brand-blush/70 transition-colors hover:text-white"
            >
              hey@danieltuyub.com
            </a>
            <p className="mt-2 text-brand-blush/70">Mérida, Yucatán</p>
          </div>
        </div>

        <p className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-brand-blush/50">
          © {YEAR} Mission Catalog
        </p>
      </div>
    </footer>
  )
}
