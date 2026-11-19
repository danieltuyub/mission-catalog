import { useTranslation } from 'react-i18next'
import { LANGUAGES, setLanguage, type Language } from '../i18n'

/** Two languages for now, so it is one button that offers the other one. */
export default function LanguageSwitch() {
  const { t, i18n } = useTranslation()
  const current = (LANGUAGES.find((l) => l === i18n.resolvedLanguage) ?? LANGUAGES[0]) as Language
  const other = LANGUAGES.find((l) => l !== current) ?? current

  return (
    <button
      type="button"
      lang={other}
      aria-label={`${t('nav.language')}: ${other.toUpperCase()}`}
      onClick={() => void setLanguage(other)}
      className="block rounded-full px-3 py-2 text-sm font-medium uppercase tracking-wide transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage"
    >
      {other}
    </button>
  )
}
