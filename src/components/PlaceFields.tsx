import { useId } from 'react'
import { COUNTRIES, isValidCountry } from '../services/countries'
import { PLACE_MAX_LENGTH, placeSuggestions, type Place } from '../services/pinPlace'
import type { Pin } from '../types'
import Combobox from './Combobox'

const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({ value: c, label: c }))

interface Props {
  value: Place
  onChange: (place: Place) => void
  /** Pins already on the map: their places are offered as suggestions. */
  known: Pick<Pin, 'country' | 'region' | 'city'>[]
  /** Classes of each input. */
  inputClassName: string
  /** Classes of the wrapper (how the three fields are laid out). */
  className?: string
  /** The country the record already had: a spelling from before the country list stays valid. */
  currentCountry?: string
  /** Classes of each label. */
  labelClassName?: string
}

/** Country (required), region and city, with the places already in use as suggestions. */
export default function PlaceFields({ value, onChange, known, inputClassName, currentCountry = '', className = 'space-y-3', labelClassName = 'block text-sm' }: Props) {
  const id = useId()
  const suggestions = placeSuggestions(known, value)
  const fields = [
    { key: 'region', label: 'Estado o región', options: suggestions.regions, required: false },
    { key: 'city', label: 'Ciudad', options: suggestions.cities, required: false },
  ] as const

  const countryId = `${id}-country`
  const invalidCountry = value.country.trim() !== '' && !isValidCountry(value.country, currentCountry)

  return (
    <div className={className}>
      <div className={labelClassName}>
        <label htmlFor={countryId}>País</label>
        <Combobox
          id={countryId}
          text={value.country}
          onText={(country) => onChange({ ...value, country })}
          onPick={(country) => onChange({ ...value, country })}
          options={COUNTRY_OPTIONS}
          listLabel="Países"
          required
          maxLength={PLACE_MAX_LENGTH}
          inputClassName={inputClassName}
        />
        {invalidCountry && <p className="mt-1 text-xs text-red-700">Elige un país de la lista</p>}
      </div>
      {fields.map((f) => (
        <label key={f.key} className={labelClassName}>
          {f.label}
          <input
            maxLength={PLACE_MAX_LENGTH}
            list={`${id}-${f.key}`}
            value={value[f.key]}
            onChange={(e) => onChange({ ...value, [f.key]: e.target.value })}
            className={inputClassName}
          />
          <datalist id={`${id}-${f.key}`}>
            {f.options.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </label>
      ))}
    </div>
  )
}
