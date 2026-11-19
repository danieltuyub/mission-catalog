import { describe, expect, it } from 'vitest'
import { getLanguages, languageLabel, MAX_LANGUAGES } from './languages'
import { isPinKind, kindLabel } from './pinKinds'

describe('languages', () => {
  const LANGUAGES = getLanguages('es')
  it('has about fifty, the most spoken first and the rest alphabetically', () => {
    expect(LANGUAGES.length).toBeGreaterThanOrEqual(50)
    expect(LANGUAGES.slice(0, 4).map((l) => l.code)).toEqual(['es', 'en', 'pt', 'fr'])
    const rest = LANGUAGES.slice(4).map((l) => l.label)
    expect(rest).toEqual([...rest].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' })))
    expect(new Set(LANGUAGES.map((l) => l.code)).size).toBe(LANGUAGES.length)
  })

  it('names them in Spanish, including the local ones the browser does not know', () => {
    expect(languageLabel('es')).toBe('Español')
    expect(languageLabel('en')).toBe('Inglés')
    expect(languageLabel('quc')).toBe("K'iche'")
    expect(languageLabel('yua')).toBe('Maya yucateco')
  })

  it('shows an unknown code as it is', () => {
    expect(languageLabel('xx')).toBe('xx')
  })

  it('matches the database limit', () => {
    expect(MAX_LANGUAGES).toBe(5)
  })
})

describe('pin kinds', () => {
  it('labels and recognises them', () => {
    expect(kindLabel('house_church')).toBe('Iglesia en casa')
    expect(kindLabel(null)).toBe('')
    expect(isPinKind('family')).toBe(true)
    expect(isPinKind('project')).toBe(false)
    expect(isPinKind('')).toBe(false)
  })
})
