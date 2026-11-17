/** Most spoken first, then the rest alphabetically; the last block are languages of the regions where the work happens. */
const PRIORITY = ['es', 'en', 'pt', 'fr']
const WIDELY_SPOKEN = [
  'zh', 'hi', 'ar', 'bn', 'ru', 'ja', 'de', 'it', 'ko', 'tr', 'vi', 'id', 'sw', 'th', 'pl', 'uk', 'nl', 'ro', 'el', 'he',
  'fa', 'ur', 'ta', 'te', 'mr', 'pa', 'fil', 'am', 'ha', 'yo', 'zu', 'ht', 'hu', 'cs', 'sv', 'ne', 'my', 'km',
]
const LOCAL = ['qu', 'ay', 'gn', 'nah', 'quc', 'kek', 'mam', 'cak', 'yua']

/** The browser does not know the names of some local languages. */
const NAMES: Record<string, string> = {
  nah: 'Náhuatl',
  quc: "K'iche'",
  kek: "Q'eqchi'",
  mam: 'Mam',
  cak: 'Kaqchikel',
  yua: 'Maya yucateco',
}

/** Same limit as the database. */
export const MAX_LANGUAGES = 5

export interface Language {
  code: string
  label: string
}

const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase('es') + text.slice(1)

function buildLanguages(): Language[] {
  const names = new Intl.DisplayNames(['es'], { type: 'language' })
  const label = (code: string) => NAMES[code] ?? capitalize(names.of(code) ?? code)
  const byLabel = (a: Language, b: Language) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' })
  const toLanguage = (code: string): Language => ({ code, label: label(code) })
  return [
    ...PRIORITY.map(toLanguage),
    ...[...WIDELY_SPOKEN, ...LOCAL].map(toLanguage).sort(byLabel),
  ]
}

export const LANGUAGES: readonly Language[] = buildLanguages()

/** Name in Spanish of a stored code; the code itself when it is not on the list. */
export const languageLabel = (code: string) => LANGUAGES.find((l) => l.code === code)?.label ?? code
