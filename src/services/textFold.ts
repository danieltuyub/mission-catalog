/** Lower case without accents: what "the same text" means when searching and matching names. */
export const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()
