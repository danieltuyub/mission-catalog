import 'i18next'
import type { resources, DEFAULT_LANGUAGE } from './index'

// Keys are checked against the Spanish files, the base language.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: (typeof resources)[typeof DEFAULT_LANGUAGE]
  }
}
