import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enCommon from './locales/en/common.json'
import enAccount from './locales/en/account.json'
import enAdmin from './locales/en/admin.json'
import enAuth from './locales/en/auth.json'
import enContact from './locales/en/contact.json'
import enErrors from './locales/en/errors.json'
import enMap from './locales/en/map.json'
import enProject from './locales/en/project.json'
import enProjects from './locales/en/projects.json'
import esCommon from './locales/es/common.json'
import esAccount from './locales/es/account.json'
import esAdmin from './locales/es/admin.json'
import esAuth from './locales/es/auth.json'
import esContact from './locales/es/contact.json'
import esErrors from './locales/es/errors.json'
import esMap from './locales/es/map.json'
import esProject from './locales/es/project.json'
import esProjects from './locales/es/projects.json'

export const LANGUAGES = ['es', 'en'] as const
export type Language = (typeof LANGUAGES)[number]
/** The base language: every key exists here first, and it is what a missing translation falls back to. */
export const DEFAULT_LANGUAGE: Language = 'es'

export const isLanguage = (value: unknown): value is Language => LANGUAGES.includes(value as Language)

/** Each language written in itself, so a reader always finds theirs. */
export const LANGUAGE_NAMES: Record<Language, string> = { es: 'Español', en: 'English' }

/** The language in use right now. */
export const currentLanguage = (): Language => (isLanguage(i18n.resolvedLanguage) ? i18n.resolvedLanguage : DEFAULT_LANGUAGE)

export const resources = {
  es: { account: esAccount, admin: esAdmin, auth: esAuth, common: esCommon, contact: esContact, errors: esErrors, map: esMap, project: esProject, projects: esProjects },
  en: { account: enAccount, admin: enAdmin, auth: enAuth, common: enCommon, contact: enContact, errors: enErrors, map: enMap, project: enProject, projects: enProjects },
} as const

const STORAGE_KEY = 'lang'

/** The saved choice, else the browser's language, else Spanish. */
export function initialLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (isLanguage(saved)) return saved
  } catch {
    // Storage can be blocked: carry on without it.
  }
  const browser = navigator.language?.slice(0, 2)
  return isLanguage(browser) ? browser : DEFAULT_LANGUAGE
}

/** Switches the language, remembers it and tells the document (screen readers, spell check). */
export async function setLanguage(language: Language): Promise<void> {
  document.documentElement.lang = language
  try {
    localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // Not remembered, still switched.
  }
  await i18n.changeLanguage(language)
}

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  defaultNS: 'common',
  ns: ['common', 'account', 'admin', 'auth', 'contact', 'errors', 'map', 'project', 'projects'],
  interpolation: { escapeValue: false }, // React already escapes
  initAsync: false, // resources are bundled: ready on the first render
})
document.documentElement.lang = i18n.language

/** A user-facing error message (`errors` namespace) in the current language. */
export const tError = (key: keyof typeof esErrors, options: { count?: number } = {}): string => i18n.t(`errors:${key}`, options)

export default i18n
