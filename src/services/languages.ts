import i18n from '../i18n'

/** Most spoken first, then the rest alphabetically; the last block are languages of the regions where the work happens. */
const PRIORITY = ['es', 'en', 'pt', 'fr']
const WIDELY_SPOKEN = [
  'zh', 'hi', 'ar', 'bn', 'ru', 'ja', 'de', 'it', 'ko', 'tr', 'vi', 'id', 'sw', 'th', 'pl', 'uk', 'nl', 'ro', 'el', 'he',
  'fa', 'ur', 'ta', 'te', 'mr', 'pa', 'fil', 'am', 'ha', 'yo', 'zu', 'ht', 'hu', 'cs', 'sv', 'ne', 'my', 'km',
]
const LOCAL = ['qu', 'ay', 'gn', 'nah', 'quc', 'kek', 'mam', 'cak', 'yua']

/** The browser does not know the names of some local languages: they come from the translations. */
const isLocal = (code: string) => LOCAL.includes(code)

/** Same limit as the database. */
export const MAX_LANGUAGES = 5

export interface Language {
  code: string
  label: string
}

const capitalize = (text: string, lng: string) => text.charAt(0).toLocaleUpperCase(lng) + text.slice(1)

const cache = new Map<string, Language[]>()

function build(lng: string): Language[] {
  const names = new Intl.DisplayNames([lng], { type: 'language' })
  const label = (code: string) =>
    isLocal(code) && i18n.exists(`map:localLanguage.${code}`, { lng })
      ? i18n.t(`map:localLanguage.${code}` as 'map:kind.person', { lng })
      : capitalize(names.of(code) ?? code, lng)
  const byLabel = (a: Language, b: Language) => a.label.localeCompare(b.label, lng, { sensitivity: 'base' })
  const toLanguage = (code: string): Language => ({ code, label: label(code) })
  return [...PRIORITY.map(toLanguage), ...[...WIDELY_SPOKEN, ...LOCAL].map(toLanguage).sort(byLabel)]
}

/** Every language offered, named in the current interface language. */
export function getLanguages(lng: string = i18n.language): readonly Language[] {
  let list = cache.get(lng)
  if (!list) {
    list = build(lng)
    cache.set(lng, list)
  }
  return list
}

/** Name of a stored code in the current language; the code itself when it is not on the list. */
export const languageLabel = (code: string) => getLanguages().find((l) => l.code === code)?.label ?? code
