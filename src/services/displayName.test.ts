import { describe, expect, it } from 'vitest'
import { fullName, initials } from './displayName'

describe('fullName', () => {
  it('joins first and last name', () => {
    expect(fullName('Ana', 'Pérez')).toBe('Ana Pérez')
  })
  it('works with only one of them and trims spaces', () => {
    expect(fullName(' Ana ', '')).toBe('Ana')
    expect(fullName('', ' Pérez ')).toBe('Pérez')
  })
  it('is empty without a name', () => {
    expect(fullName('', '  ')).toBe('')
  })
})

describe('initials', () => {
  it('uses both initials, uppercased', () => {
    expect(initials('ana', 'pérez')).toBe('AP')
  })
  it('uses one letter when there is no last name', () => {
    expect(initials('Ana', '')).toBe('A')
  })
  it('keeps accents and does not split astral characters', () => {
    expect(initials('Álvaro', 'Ñandú')).toBe('ÁÑ')
    expect(initials('😀x', '')).toBe('😀')
  })
  it('is empty without a name', () => {
    expect(initials('', ' ')).toBe('')
  })
})
