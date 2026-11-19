import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { can } from '../services/permissions'

const LINKS = [
  { href: '#/mapa', key: 'nav.map' },
  { href: '#/proyectos', key: 'nav.projects' },
  { href: '#/contacto', key: 'nav.contact' },
] as const

const YEAR = new Date().getFullYear()

export default function Footer() {
  const { t } = useTranslation()
  // Admins read the contact messages: they have nobody to contact here.
  const isAdmin = can(useAuth(), 'users.manage')
  const links = isAdmin ? LINKS.filter((l) => l.href !== '#/contacto') : LINKS
  return (
    <footer className="pb-5 pt-5">
      <div className="mx-auto w-[94%] rounded-3xl bg-brand-primary px-6 pb-6 pt-14 text-brand-blush md:w-4/5 md:px-12 md:pt-16">
        <div className="text-center">
          <p className="mx-auto max-w-2xl text-lg leading-relaxed">
            {t('footer.pitch')}
          </p>
          {!isAdmin && (
            <a
              href="#/contacto"
              className="mt-8 inline-block rounded-full bg-brand-blush px-6 py-2 text-sm font-medium text-brand-primary transition-colors hover:bg-brand-sage"
            >
              {t('footer.contactUs')}
            </a>
          )}
        </div>

        <div className="mt-14 grid gap-10 border-t border-white/10 pt-10 text-center text-sm md:grid-cols-3 md:text-left">
          <div>
            <p className="font-medium text-white">Mission Catalog</p>
            <p className="mx-auto mt-2 max-w-xs text-brand-blush/70 md:mx-0 md:max-w-none">
              {t('footer.about')}
            </p>
          </div>

          <nav aria-label={t('footer.label')} className="md:justify-self-center">
            <ul className="space-y-2">
              {links.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="text-brand-blush/70 transition-colors hover:text-white">
                    {t(l.key)}
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
            <p className="mt-2 text-brand-blush/70">{t('footer.place')}</p>
          </div>
        </div>

        <p className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-brand-blush/50">
          © {YEAR} Mission Catalog
        </p>
      </div>
    </footer>
  )
}
