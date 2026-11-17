import type { Pin } from '../types'

/** Same limit as the database. */
export const PLACE_MAX_LENGTH = 100

export interface Place {
  country: string
  region: string
  city: string
}

export const EMPTY_PLACE: Place = { country: '', region: '', city: '' }

/** Trimmed, with inner runs of spaces collapsed. */
export const cleanPlaceText = (text: string) => text.trim().replace(/\s+/g, ' ')

const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

/** Distinct non-empty values, alphabetically (Spanish). */
const distinct = (values: string[]) =>
  [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))

/** What to suggest for each field: the countries in use, and the regions and cities of the chosen ones. */
export function placeSuggestions(known: Pick<Pin, 'country' | 'region' | 'city'>[], place: Place) {
  const sameCountry = known.filter((p) => !place.country.trim() || fold(p.country) === fold(place.country.trim()))
  const sameRegion = sameCountry.filter((p) => !place.region.trim() || fold(p.region) === fold(place.region.trim()))
  return {
    countries: distinct(known.map((p) => p.country)),
    regions: distinct(sameCountry.map((p) => p.region)),
    cities: distinct(sameRegion.map((p) => p.city)),
  }
}

/**
 * Cleans the three values and, when one matches a spelling already in use ("mexico" for "México"),
 * takes that spelling, so the same place is never split in two by accents or case.
 */
export function canonicalPlace(place: Place, known: Pick<Pin, 'country' | 'region' | 'city'>[]): Place {
  const pick = (value: string, options: string[]) => {
    const text = cleanPlaceText(value)
    return options.find((o) => fold(o) === fold(text)) ?? text
  }
  const country = pick(place.country, distinct(known.map((p) => p.country)))
  const inCountry = known.filter((p) => fold(p.country) === fold(country))
  const region = pick(place.region, distinct(inCountry.map((p) => p.region)))
  // Without a region, a city is looked for in the whole country (as the suggestions do).
  const inRegion = region ? inCountry.filter((p) => fold(p.region) === fold(region)) : inCountry
  return { country, region, city: pick(place.city, distinct(inRegion.map((p) => p.city))) }
}

/** "City, Region, Country", leaving out what is missing. */
export const placeLabel = (place: Place) =>
  [place.city, place.region, place.country].filter(Boolean).join(', ')
