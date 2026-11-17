import { describe, expect, it } from 'vitest'
import { canonicalPlace, cleanPlaceText, placeLabel, placeSuggestions } from './pinPlace'

const known = [
  { country: 'México', region: 'Yucatán', city: 'Mérida' },
  { country: 'México', region: 'Yucatán', city: 'Valladolid' },
  { country: 'México', region: 'Chiapas', city: 'Tapachula' },
  { country: 'Guatemala', region: 'Sacatepéquez', city: 'Antigua' },
  { country: '', region: '', city: '' },
]

describe('placeSuggestions', () => {
  it('offers each country once, alphabetically, without empties', () => {
    expect(placeSuggestions(known, { country: '', region: '', city: '' }).countries).toEqual(['Guatemala', 'México'])
  })

  it('narrows regions and cities to what was chosen, ignoring accents and case', () => {
    const s = placeSuggestions(known, { country: 'mexico', region: 'yucatan', city: '' })
    expect(s.regions).toEqual(['Chiapas', 'Yucatán'])
    expect(s.cities).toEqual(['Mérida', 'Valladolid'])
  })
})

describe('canonicalPlace', () => {
  it('cleans spaces', () => {
    expect(cleanPlaceText('  San   José ')).toBe('San José')
  })

  it('takes the spelling already in use', () => {
    expect(canonicalPlace({ country: ' mexico', region: 'YUCATAN', city: 'merida ' }, known)).toEqual({
      country: 'México',
      region: 'Yucatán',
      city: 'Mérida',
    })
  })

  it('keeps new values as typed (cleaned) and does not borrow another country’s regions', () => {
    expect(canonicalPlace({ country: 'Chile', region: 'yucatan', city: '' }, known)).toEqual({ country: 'Chile', region: 'yucatan', city: '' })
  })
})

describe('placeLabel', () => {
  it('joins city, region and country, leaving out what is missing', () => {
    expect(placeLabel({ country: 'México', region: '', city: 'Mérida' })).toBe('Mérida, México')
    expect(placeLabel({ country: '', region: '', city: '' })).toBe('')
  })
})
