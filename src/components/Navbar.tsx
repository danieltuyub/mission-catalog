import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { useUnreadContacts } from '../hooks/useUnreadContacts'
import { useUnreadMessages } from '../hooks/useUnreadMessages'
import type { Route } from '../hooks/useRoute'
import { can } from '../services/permissions'
import LanguageSwitch from './LanguageSwitch'
import UserMenu from './UserMenu'

const LINKS = [
  { route: 'mapa', key: 'nav.map' },
  { route: 'proyectos', key: 'nav.projects' },
  { route: 'contacto', key: 'nav.contact' },
] as const satisfies readonly { route: Route; key: string }[]

export default function Navbar({ current }: { current: Route }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const auth = useAuth()
  const { email, loading, firstName, lastName } = auth
  // Admins also count the contact-form messages nobody has read.
  const unread = useUnreadMessages() + useUnreadContacts()
  const isAdmin = can(auth, 'users.manage')

  // The mobile menu and the user menu never stay open together.
  const changeUserOpen = (next: boolean) => {
    setUserOpen(next)
    if (next) setOpen(false)
  }
  const toggleMenu = () => {
    setOpen((o) => !o)
    setUserOpen(false)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header className="relative z-[3000] flex justify-center pb-5 pt-5">
      <nav
        aria-label={t('nav.label')}
        className="relative flex w-[94%] items-center justify-between rounded-full bg-brand-primary px-3 py-2.5 text-brand-blush shadow-lg shadow-brand-primary/25 md:w-4/5"
      >
        <a href="#/mapa" aria-label="Mission Catalog" className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-brand-blush">
            <svg viewBox="0 0 24 24" className="size-5 fill-brand-primary" aria-hidden="true">
              <path d="M12 2C8.1 2 5 5 5 8.800 5 14 12 22 12 22s7-8 7-13.200C19 5 15.900 2 12 2zm0 9.500a2.700 2.700 0 1 1 0-5.400 2.700 2.700 0 0 1 0 5.400z" />
            </svg>
          </span>
          <span className="hidden text-sm font-semibold sm:inline">Mission Catalog</span>
        </a>

        <ul
          id="main-menu"
          className={`${open ? 'flex' : 'hidden'} absolute inset-x-0 top-full mt-3 flex-col items-center gap-1 rounded-3xl bg-brand-primary p-5 shadow-lg shadow-brand-primary/25 md:static md:ml-auto md:mt-0 md:flex md:flex-row md:gap-2 md:rounded-none md:bg-transparent md:p-0 md:shadow-none`}
        >
          {LINKS.filter((l) => !(isAdmin && l.route === 'contacto')).map(({ route, key }) => (
            <li key={route}>
              <a
                href={`#/${route}`}
                onClick={() => setOpen(false)}
                aria-current={current === route ? 'page' : undefined}
                className={`block rounded-full px-5 py-2 text-sm transition-colors ${
                  current === route ? 'bg-brand-sage font-medium text-brand-primary' : 'hover:bg-white/10'
                }`}
              >
                {t(key)}
              </a>
            </li>
          ))}
          <li>
            <LanguageSwitch />
          </li>
          {/* Not shown while the stored session is still being resolved (avoids a flash). */}
          {!email && !loading && (
            <li>
              <a
                href="#/login"
                onClick={() => setOpen(false)}
                className="block rounded-full px-5 py-2 text-sm ring-1 ring-brand-blush/40 transition-colors hover:bg-white/10 md:ml-1"
              >
                {t('nav.signIn')}
              </a>
            </li>
          )}
        </ul>

        <div className={`flex items-center gap-2 ${email ? 'md:ml-3' : 'md:hidden'}`}>
          {email && (
            <UserMenu
              email={email}
              firstName={firstName}
              lastName={lastName}
              loading={loading}
              unread={unread}
              isAdmin={isAdmin}
              active={current === 'cuenta' || current === 'admin'}
              open={userOpen}
              onOpenChange={changeUserOpen}
            />
          )}
          <button
            type="button"
            aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}
            aria-expanded={open}
            aria-controls="main-menu"
            onClick={toggleMenu}
            className="flex size-10 items-center justify-center rounded-full bg-brand-blush md:hidden"
          >
            <svg viewBox="0 0 24 24" className="size-5 stroke-brand-primary" fill="none" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </nav>
    </header>
  )
}
