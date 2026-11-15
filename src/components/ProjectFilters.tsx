import { useState } from 'react'
import type { FilterOptions, ProjectFilters as Filters } from '../services/projectService'
import { countActiveFilters } from '../services/filterUtils'
import { FILTER_SEARCH_THRESHOLD } from '../pages/projectsConfig'
import { STATUS_META, STATUS_ORDER } from './projectStatus'

interface Option {
  value: string
  label: string
  dot?: string
}

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

function CheckboxGroup({
  legend,
  options,
  selected,
  onToggle,
  searchable = false,
  note,
}: {
  legend: string
  options: Option[]
  selected: string[]
  onToggle: (value: string) => void
  searchable?: boolean
  note?: string
}) {
  const [query, setQuery] = useState('')
  const q = normalize(query.trim())
  // Selected values stay visible while searching.
  const visible = q
    ? options.filter((o) => selected.includes(o.value) || normalize(o.label).includes(q))
    : options

  return (
    <div className="border-t border-stone-100 pt-4">
      <fieldset className="min-w-0">
        <legend className="mb-2 text-sm font-medium text-brand-primary">{legend}</legend>
        {searchable && (
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={`Buscar en ${legend}`}
            placeholder="Buscar…"
            className="mb-2 h-9 w-full rounded-full bg-stone-50 px-4 text-sm text-brand-primary ring-1 ring-black/5 placeholder:text-stone-400 focus-visible:outline-2 focus-visible:outline-brand-sage"
          />
        )}
        {note && <p className="text-sm text-stone-400">{note}</p>}
        <ul className="max-h-44 space-y-1 overflow-y-auto pr-1">
          {visible.map((o) => (
            <li key={o.value}>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg py-1 text-sm text-brand-primary hover:bg-brand-blush/40">
                <input
                  type="checkbox"
                  checked={selected.includes(o.value)}
                  onChange={() => onToggle(o.value)}
                  className="size-4 shrink-0 cursor-pointer rounded accent-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage"
                />
                {o.dot && <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${o.dot}`} />}
                <span className="truncate" title={o.label}>
                  {o.label}
                </span>
              </label>
            </li>
          ))}
        </ul>
        {q && visible.length === 0 && <p className="text-sm text-stone-400">Sin resultados</p>}
      </fieldset>
    </div>
  )
}

const toggle = <T extends string>(list: T[], value: T): T[] =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value]

const asOptions = (values: string[] = []): Option[] => values.map((v) => ({ value: v, label: v }))

interface Props {
  filters: Filters
  options: FilterOptions | null
  optionsLoading: boolean
  optionsError: string | null
  onChange: (next: Filters) => void
  onClear: () => void
  /** Offers "Solo míos" (people who can own projects). */
  showMine?: boolean
}

export default function ProjectFilters({
  filters,
  options,
  optionsLoading,
  optionsError,
  onChange,
  onClear,
  showMine = false,
}: Props) {
  const active = countActiveFilters(filters)
  const note = optionsError
    ? 'No se pudieron cargar las opciones'
    : optionsLoading
      ? 'Cargando…'
      : undefined
  const emptyNote = (values: string[] = []) => note ?? (values.length === 0 ? 'Sin opciones' : undefined)

  return (
    <form
      aria-labelledby="filters-title"
      onSubmit={(e) => e.preventDefault()}
      className="space-y-4 rounded-2xl bg-white p-5 shadow ring-1 ring-black/5"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="filters-title" className="flex items-center gap-2 text-lg font-semibold text-brand-primary">
          Filtros
          {active > 0 && (
            <span
              aria-label={`${active} filtros activos`}
              className="rounded-full bg-brand-primary px-2 py-0.5 text-xs font-medium text-brand-blush"
            >
              {active}
            </span>
          )}
        </h2>
        <button
          type="button"
          onClick={onClear}
          disabled={active === 0}
          aria-label="Limpiar"
          title="Limpiar filtros"
          className="flex size-9 items-center justify-center rounded-full text-brand-primary enabled:hover:bg-brand-blush/70 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-brand-sage"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m16 22-1-4" />
            <path d="M19 13.99a1 1 0 0 0 1-1V12a2 2 0 0 0-2-2h-3a1 1 0 0 1-1-1V4a2 2 0 0 0-4 0v5a1 1 0 0 1-1 1H6a2 2 0 0 0-2 2v.99a1 1 0 0 0 1 1" />
            <path d="M5 14h14l1.973 6.767A1 1 0 0 1 20 22H4a1 1 0 0 1-.973-1.233z" />
            <path d="m8 22 1-4" />
          </svg>
        </button>
      </div>

      {showMine && (
        <div className="border-t border-stone-100 pt-4">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg py-1 text-sm font-medium text-brand-primary hover:bg-brand-blush/40">
            <input
              type="checkbox"
              checked={!!filters.mine}
              onChange={() => onChange({ ...filters, mine: !filters.mine })}
              className="size-4 shrink-0 cursor-pointer rounded accent-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage"
            />
            Solo míos
          </label>
        </div>
      )}

      <CheckboxGroup
        legend="Estado"
        options={STATUS_ORDER.map((s) => ({ value: s, label: STATUS_META[s].label, dot: STATUS_META[s].dot }))}
        selected={filters.status}
        onToggle={(v) => onChange({ ...filters, status: toggle(filters.status, v as Filters['status'][number]) })}
      />
      <CheckboxGroup
        legend="País"
        options={asOptions(options?.country)}
        selected={filters.country}
        onToggle={(v) => onChange({ ...filters, country: toggle(filters.country, v) })}
        searchable={(options?.country.length ?? 0) > FILTER_SEARCH_THRESHOLD}
        note={emptyNote(options?.country)}
      />
      <CheckboxGroup
        legend="Región"
        options={asOptions(options?.region)}
        selected={filters.region}
        onToggle={(v) => onChange({ ...filters, region: toggle(filters.region, v) })}
        searchable={(options?.region.length ?? 0) > FILTER_SEARCH_THRESHOLD}
        note={emptyNote(options?.region)}
      />
      <CheckboxGroup
        legend="Encargado"
        options={asOptions(options?.responsible)}
        selected={filters.responsible}
        onToggle={(v) => onChange({ ...filters, responsible: toggle(filters.responsible, v) })}
        searchable={(options?.responsible.length ?? 0) > FILTER_SEARCH_THRESHOLD}
        note={emptyNote(options?.responsible)}
      />
    </form>
  )
}
