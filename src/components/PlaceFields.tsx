import { useId } from 'react'
import { PLACE_MAX_LENGTH, placeSuggestions, type Place } from '../services/pinPlace'
import type { Pin } from '../types'

interface Props {
  value: Place
  onChange: (place: Place) => void
  /** Pins already on the map: their places are offered as suggestions. */
  known: Pick<Pin, 'country' | 'region' | 'city'>[]
  /** Classes of each input. */
  inputClassName: string
  /** Classes of the wrapper (how the three fields are laid out). */
  className?: string
  /** Classes of each label. */
  labelClassName?: string
}

/** Country (required), region and city, with the places already in use as suggestions. */
export default function PlaceFields({ value, onChange, known, inputClassName, className = 'space-y-3', labelClassName = 'block text-sm' }: Props) {
  const id = useId()
  const suggestions = placeSuggestions(known, value)
  const fields = [
    { key: 'country', label: 'País', options: suggestions.countries, required: true },
    { key: 'region', label: 'Estado o región', options: suggestions.regions, required: false },
    { key: 'city', label: 'Ciudad', options: suggestions.cities, required: false },
  ] as const

  return (
    <div className={className}>
      {fields.map((f) => (
        <label key={f.key} className={labelClassName}>
          {f.label}
          <input
            required={f.required}
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
