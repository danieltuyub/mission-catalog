import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enCommon from './locales/en/common.json'
import enAccount from './locales/en/account.json'
import enAuth from './locales/en/auth.json'
import enMap from './locales/en/map.json'
import enProjects from './locales/en/projects.json'
import esCommon from './locales/es/common.json'
import esAccount from './locales/es/account.json'
import esAuth from './locales/es/auth.json'
import esMap from './locales/es/map.json'
import esProjects from './locales/es/projects.json'

export const LANGUAGES = ['es', 'en'] as const
export type Language = (typeof LANGUAGES)[number]
/** The base language: every key exists here first, and it is what a missing translation falls back to. */
export const DEFAULT_LANGUAGE: Language = 'es'

export const resources = {
  es: { account: esAccount, auth: esAuth, common: esCommon, map: esMap, projects: esProjects },
  en: { account: enAccount, auth: enAuth, common: enCommon, map: enMap, projects: enProjects },
} as const

const STORAGE_KEY = 'lang'

const isLanguage = (value: unknown): value is Language => LANGUAGES.includes(value as Language)

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
  ns: ['common', 'account', 'auth', 'map', 'projects'],
  interpolation: { escapeValue: false }, // React already escapes
  initAsync: false, // resources are bundled: ready on the first render
})
document.documentElement.lang = i18n.language

export default i18n
