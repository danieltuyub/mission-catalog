import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { LANGUAGES, LANGUAGE_NAMES, currentLanguage, setLanguage } from '../i18n'
import { setPreferredLanguage } from '../services/accountService'

/** Two languages for now, so it is one button that offers the other one. A globe and the language's own name tell it apart from the user's initials. */
export default function LanguageSwitch() {
  const { t } = useTranslation()
  const { userId } = useAuth()
  const current = currentLanguage()
  const other = LANGUAGES.find((l) => l !== current) ?? current
  const name = LANGUAGE_NAMES[other]

  async function choose() {
    await setLanguage(other)
    // Signed in: the choice follows the user to every device.
    if (userId) await setPreferredLanguage(userId, other).catch(() => {})
  }

  return (
    <button
      type="button"
      lang={other}
      aria-label={`${t('nav.language')}: ${name}`}
      onClick={() => void choose()}
      className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22a10 10 0 100-20 10 10 0 000 20zM2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" />
      </svg>
      {name}
    </button>
  )
}
