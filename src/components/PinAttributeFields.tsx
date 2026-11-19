import FormSelect from './FormSelect'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getLanguages, languageLabel, MAX_LANGUAGES } from '../services/languages'
import { PIN_KINDS } from '../services/pinKinds'
import Combobox from './Combobox'

export interface PinAttributes {
  /** Empty until chosen. */
  kind: string
  languages: string[]
}

interface Props {
  value: PinAttributes
  onChange: (value: PinAttributes) => void
  inputClassName: string
  className?: string
  labelClassName?: string
}

/** Type (required) and languages (up to 5, searchable list) of a pin. */
export default function PinAttributeFields({ value, onChange, inputClassName, className = 'space-y-3', labelClassName = 'block text-sm' }: Props) {
  const { t } = useTranslation('map')
  const id = useId()
  const [text, setText] = useState('')
  const available = getLanguages().filter((l) => !value.languages.includes(l.code)).map((l) => ({ value: l.code, label: l.label }))
  const full = value.languages.length >= MAX_LANGUAGES

  const add = (code: string) => {
    setText('')
    onChange({ ...value, languages: [...value.languages, code] })
  }
  const remove = (code: string) => onChange({ ...value, languages: value.languages.filter((c) => c !== code) })

  return (
    <div className={className}>
      <label className={labelClassName}>
        {t('fields.kind')}
        <FormSelect
          required
          value={value.kind}
          onChange={(e) => onChange({ ...value, kind: e.target.value })}
          className={inputClassName}
        >
          <option value="" disabled>
            {t('fields.chooseKind')}
          </option>
          {PIN_KINDS.map((k) => (
            <option key={k.id} value={k.id}>
              {t(`kind.${k.id}`)}
            </option>
          ))}
        </FormSelect>
      </label>

      <div className={labelClassName}>
        <label htmlFor={`${id}-lang`}>{t('fields.languages')}</label>
        {value.languages.length > 0 && (
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {value.languages.map((code) => (
              <li key={code} className="inline-flex items-center gap-1 rounded-full bg-stone-100 py-0.5 pl-2.5 pr-1 text-xs text-stone-700">
                {languageLabel(code)}
                <button
                  type="button"
                  aria-label={t('fields.remove', { name: languageLabel(code) })}
                  onClick={() => remove(code)}
                  className="flex size-4 items-center justify-center rounded-full hover:bg-stone-200 focus-visible:outline-2 focus-visible:outline-brand-sage"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
        {full ? (
          <p className="mt-1 text-xs text-gray-500">{t('fields.maxLanguages', { count: MAX_LANGUAGES })}</p>
        ) : (
          <Combobox
            id={`${id}-lang`}
            text={text}
            onText={setText}
            onPick={add}
            options={available}
            listLabel={t('fields.languages')}
            placeholder={t('fields.searchLanguage')}
            inputClassName={inputClassName}
          />
        )}
      </div>
    </div>
  )
}
