import { fold } from './textFold'

/** ISO 3166-1 alpha-2 codes. The names come from the browser (`Intl.DisplayNames`), in Spanish: no external service. */
const CODES =
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(
    ' ',
  )

function buildCountries(): string[] {
  const names = new Intl.DisplayNames(['es'], { type: 'region' })
  const list = CODES.map((code) => names.of(code)).filter((name): name is string => !!name && name.length > 2)
  return [...new Set(list)].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
}

/** Every country, in Spanish, alphabetically. */
export const COUNTRIES: readonly string[] = buildCountries()

/** The list's spelling of a country typed any way ("mexico" -> "México"); null when it is not on the list. */
export function matchCountry(text: string): string | null {
  const wanted = fold(text)
  return wanted ? (COUNTRIES.find((c) => fold(c) === wanted) ?? null) : null
}

/**
 * A country is valid when it is on the list. `current` is the value a record already has: a spelling from
 * before the list existed stays valid (and editable) until someone chooses a country from it.
 */
export const isValidCountry = (text: string, current = '') =>
  matchCountry(text) !== null || (!!fold(text) && fold(text) === fold(current))
