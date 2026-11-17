import { describe, expect, it } from 'vitest'
import { COUNTRIES, isValidCountry, matchCountry } from './countries'

describe('COUNTRIES', () => {
  it('has the countries in Spanish, alphabetically and without repeats', () => {
    expect(COUNTRIES.length).toBeGreaterThan(200)
    expect(COUNTRIES).toContain('México')
    expect(COUNTRIES).toContain('Estados Unidos')
    expect(new Set(COUNTRIES).size).toBe(COUNTRIES.length)
    expect([...COUNTRIES]).toEqual([...COUNTRIES].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' })))
  })
})

describe('matchCountry', () => {
  it('finds the list spelling whatever the accents, case or spaces', () => {
    expect(matchCountry(' mexico ')).toBe('México')
    expect(matchCountry('GUATEMALA')).toBe('Guatemala')
  })

  it('is null for what is not a country', () => {
    expect(matchCountry('Narnia')).toBeNull()
    expect(matchCountry('')).toBeNull()
  })
})

describe('isValidCountry', () => {
  it('accepts the list, and a previous spelling only for the record that has it', () => {
    expect(isValidCountry('mexico')).toBe(true)
    expect(isValidCountry('USA')).toBe(false)
    expect(isValidCountry('USA', 'USA')).toBe(true)
    expect(isValidCountry('', '')).toBe(false)
  })
})
