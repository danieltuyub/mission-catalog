import i18n from '../../i18n'

export const ghostButton =
  'inline-flex h-9 items-center justify-center rounded-full bg-white px-4 text-sm text-brand-primary ring-1 ring-black/10 hover:bg-brand-blush focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage disabled:opacity-50'
export const primaryButton =
  'inline-flex h-9 items-center justify-center rounded-full bg-brand-primary px-4 text-sm font-medium text-brand-blush hover:bg-brand-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage disabled:opacity-50'
export const dangerButton =
  'inline-flex h-9 items-center justify-center rounded-full bg-red-700 px-4 text-sm font-medium text-white hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:opacity-50'
export const inputClass =
  'h-10 rounded-md border border-gray-300 px-3 text-sm text-gray-900 outline-none focus:border-brand-sage focus:ring-1 focus:ring-brand-sage'

export const card = 'rounded-2xl bg-white p-4 shadow ring-1 ring-black/5'

/** Long dates in the current language (read at call time, so a language change shows on the next render). */
export const dateFormat = {
  format: (date: Date) => new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long' }).format(date),
}

/** Case and accent insensitive "contains". */
export const matches = (text: string, query: string) =>
  text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().includes(query.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim())
