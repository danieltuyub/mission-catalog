import { useId, useState, type KeyboardEvent } from 'react'
import { fold } from '../services/textFold'

export interface ComboOption {
  value: string
  label: string
}

interface Props {
  id: string
  /** What the input shows. The parent owns it. */
  text: string
  onText: (text: string) => void
  /** An option was chosen. */
  onPick: (value: string) => void
  options: readonly ComboOption[]
  inputClassName: string
  placeholder?: string
  required?: boolean
  maxLength?: number
  /** Name of the list for screen readers. */
  listLabel: string
  'aria-label'?: string
}

/** Text input with a searchable list (ignores accents and case): for choices too many for a plain select. */
export default function Combobox({
  id,
  text,
  onText,
  onPick,
  options,
  inputClassName,
  placeholder,
  required,
  maxLength,
  listLabel,
  'aria-label': ariaLabel,
}: Props) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const wanted = fold(text)
  // What starts with the text first, then what only contains it.
  const shown = wanted
    ? [
        ...options.filter((o) => fold(o.label).startsWith(wanted)),
        ...options.filter((o) => !fold(o.label).startsWith(wanted) && fold(o.label).includes(wanted)),
      ]
    : options
  const current = Math.min(active, Math.max(shown.length - 1, 0))

  const pick = (option: ComboOption) => {
    onPick(option.value)
    setOpen(false)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(Math.max(Math.min(i, shown.length - 1) + (e.key === 'ArrowDown' ? 1 : -1), 0), shown.length - 1))
    } else if (e.key === 'Enter' && open && shown[current]) {
      e.preventDefault()
      pick(shown[current])
    } else if (e.key === 'Escape' && open) {
      // Closes the list, not the dialog around it.
      e.stopPropagation()
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && shown[current] ? `${listId}-${current}` : undefined}
        aria-label={ariaLabel}
        autoComplete="off"
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        value={text}
        onChange={(e) => {
          onText(e.target.value)
          setOpen(true)
          setActive(0)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className={inputClassName}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={listLabel}
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md bg-white py-1 text-sm text-gray-900 shadow-lg ring-1 ring-black/10"
        >
          {shown.length === 0 && <li className="px-3 py-2 text-gray-500">Sin resultados</li>}
          {shown.map((o, i) => (
            <li
              key={o.value}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === current}
              // Before the input loses focus, so the choice is not lost.
              onMouseDown={(e) => {
                e.preventDefault()
                pick(o)
              }}
              className={`cursor-pointer px-3 py-1.5 ${i === current ? 'bg-brand-blush' : 'hover:bg-stone-50'}`}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
