import { describe, expect, it } from 'vitest'
import { generatePassword, GENERATED_PASSWORD_LENGTH } from './passwords'

describe('generatePassword', () => {
  it('has the expected length and only readable characters', () => {
    const password = generatePassword()
    expect(password).toHaveLength(GENERATED_PASSWORD_LENGTH)
    expect(password).toMatch(/^[a-km-zA-HJ-NP-Z2-9]+$/)
  })

  it('always mixes lower case, upper case and digits', () => {
    for (let i = 0; i < 200; i++) {
      const password = generatePassword()
      expect(password).toMatch(/[a-z]/)
      expect(password).toMatch(/[A-Z]/)
      expect(password).toMatch(/\d/)
    }
  })

  it('is different every time', () => {
    expect(new Set(Array.from({ length: 50 }, () => generatePassword())).size).toBe(50)
  })

  it('accepts another length', () => {
    expect(generatePassword(20)).toHaveLength(20)
  })
})
