import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { FilterOptions, ProjectFilters as Filters } from '../services/projectService'
import { countActiveFilters } from '../services/filterUtils'
import { FILTER_SEARCH_THRESHOLD } from '../pages/projectsConfig'
import { STATUS_META, STATUS_ORDER, useStatusLabel } from './projectStatus'

interface Option {
  value: string
  label: string
  dot?: string
}

/** Options shown before "Ver más". */
const COLLAPSED_COUNT = 5

// Icons next to the group titles (stroke paths, 24x24).
const ICONS = {
  status: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  country: <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" />,
  region: (
    <>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  responsible: (
    <>
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
}

function Legend({ icon, children }: { icon: keyof typeof ICONS; children: ReactNode }) {
  return (
    <legend className="mb-2 flex items-center gap-2 text-sm font-medium text-brand-primary">
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 text-stone-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {ICONS[icon]}
      </svg>
      {children}
    </legend>
  )
}

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

function CheckboxGroup({
  legend,
  icon,
  options,
  selected,
  onToggle,
  searchable = false,
  note,
}: {
  legend: string
  icon: keyof typeof ICONS
  options: Option[]
  selected: string[]
  onToggle: (value: string) => void
  searchable?: boolean
  note?: string
}) {
  const { t } = useTranslation('projects')
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(false)
  const q = normalize(query.trim())
  const collapsible = !q && options.length > COLLAPSED_COUNT
  // Selected values stay visible while searching and while collapsed.
  const visible = q
    ? options.filter((o) => selected.includes(o.value) || normalize(o.label).includes(q))
    : collapsible && !expanded
      ? options.filter((o, i) => i < COLLAPSED_COUNT || selected.includes(o.value))
      : options
  const hidden = options.length - visible.length

  return (
    <div className="border-t border-stone-100 pt-4">
      <fieldset className="min-w-0">
        <Legend icon={icon}>{legend}</Legend>
        {searchable && (
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t('filter.searchIn', { legend })}
            placeholder={t('filter.search')}
            className="mb-2 h-9 w-full rounded-full bg-stone-50 px-4 text-sm text-brand-primary ring-1 ring-black/5 placeholder:text-stone-400 focus-visible:outline-2 focus-visible:outline-brand-sage"
          />
        )}
        {note && <p className="text-sm text-stone-400">{note}</p>}
        <ul className={`space-y-1 ${q || expanded ? 'max-h-44 overflow-y-auto pr-1' : ''}`}>
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
        {q && visible.length === 0 && <p className="text-sm text-stone-400">{t('filter.noResults')}</p>}
        {collapsible && (hidden > 0 || expanded) && (
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((e) => !e)}
            className="mt-1 rounded-full px-2 py-1 text-xs text-stone-500 underline underline-offset-2 hover:bg-brand-blush/50 hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-brand-sage"
          >
            {expanded ? t('filter.showLess') : t('filter.showMore', { count: hidden })}
          </button>
        )}
      </fieldset>
    </div>
  )
}

/** Pill toggle: a checkbox in disguise, so keyboard and screen readers work as for any checkbox. */
function Chip({
  checked,
  onChange,
  dot,
  icon,
  children,
}: {
  checked: boolean
  onChange: () => void
  dot?: string
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <label className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full bg-stone-50 px-2.5 text-xs font-medium text-brand-primary ring-1 ring-black/5 hover:bg-brand-blush/60 has-checked:bg-brand-primary has-checked:text-brand-blush has-checked:hover:bg-brand-primary/90 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand-sage">
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      {dot && <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${dot}`} />}
      {icon}
      {children}
    </label>
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
  const { t } = useTranslation('projects')
  const statusLabel = useStatusLabel()
  const active = countActiveFilters(filters)
  const note = optionsError ? t('filter.loadFailed') : optionsLoading ? t('filter.loadingOptions') : undefined
  const emptyNote = (values: string[] = []) => note ?? (values.length === 0 ? t('filter.noOptions') : undefined)

  return (
    <form
      aria-labelledby="filters-title"
      onSubmit={(e) => e.preventDefault()}
      className="space-y-4 rounded-2xl bg-white p-5 shadow ring-1 ring-black/5"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="filters-title" className="flex items-center gap-2 text-lg font-semibold text-brand-primary">
          {t('filter.title')}
          {active > 0 && (
            <span
              aria-label={t('filter.active', { count: active })}
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
          aria-label={t('filter.clear')}
          title={t('filter.clearTitle')}
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
          <Chip
            checked={!!filters.mine}
            onChange={() => onChange({ ...filters, mine: !filters.mine })}
            icon={
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {ICONS.responsible}
              </svg>
            }
          >
            {t('filter.mine')}
          </Chip>
        </div>
      )}

      <div className="border-t border-stone-100 pt-4">
        <fieldset className="min-w-0">
          <Legend icon="status">{t('filter.status')}</Legend>
          <div className="flex flex-wrap gap-2">
            {STATUS_ORDER.map((status) => (
              <Chip
                key={status}
                dot={STATUS_META[status].dot}
                checked={filters.status.includes(status)}
                onChange={() => onChange({ ...filters, status: toggle(filters.status, status) })}
              >
                {statusLabel(status)}
              </Chip>
            ))}
          </div>
        </fieldset>
      </div>
      <CheckboxGroup
        legend={t('filter.country')}
        icon="country"
        options={asOptions(options?.country)}
        selected={filters.country}
        onToggle={(v) => onChange({ ...filters, country: toggle(filters.country, v) })}
        searchable={(options?.country.length ?? 0) > FILTER_SEARCH_THRESHOLD}
        note={emptyNote(options?.country)}
      />
      <CheckboxGroup
        legend={t('filter.region')}
        icon="region"
        options={asOptions(options?.region)}
        selected={filters.region}
        onToggle={(v) => onChange({ ...filters, region: toggle(filters.region, v) })}
        searchable={(options?.region.length ?? 0) > FILTER_SEARCH_THRESHOLD}
        note={emptyNote(options?.region)}
      />
      <CheckboxGroup
        legend={t('filter.responsible')}
        icon="responsible"
        options={asOptions(options?.responsible)}
        selected={filters.responsible}
        onToggle={(v) => onChange({ ...filters, responsible: toggle(filters.responsible, v) })}
        searchable={(options?.responsible.length ?? 0) > FILTER_SEARCH_THRESHOLD}
        note={emptyNote(options?.responsible)}
      />
    </form>
  )
}
