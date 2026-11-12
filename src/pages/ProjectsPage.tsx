import { useEffect, useRef, useState, type CSSProperties } from 'react'
import AnimatedHeight from '../components/AnimatedHeight'
import PageHeader from '../components/PageHeader'
import Pagination from '../components/Pagination'
import ProjectCard from '../components/ProjectCard'
import ProjectFilters from '../components/ProjectFilters'
import Select from '../components/Select'
import SortDirectionToggle from '../components/SortDirectionToggle'
import { useFilterOptions } from '../hooks/useFilterOptions'
import { useProjects } from '../hooks/useProjects'
import { countActiveFilters } from '../services/filterUtils'
import {
  DEFAULT_DIRECTION,
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORT,
  EMPTY_FILTERS,
  type ProjectFilters as Filters,
  type ProjectSort,
  type SortDirection,
} from '../services/projectService'
import {
  loadDirection,
  loadFilters,
  loadPageSize,
  loadSort,
  saveDirection,
  saveFilters,
  savePageSize,
  saveSort,
} from '../services/projectsViewStorage'
import {
  CARD_GAP_REM,
  CARD_HEIGHT_REM,
  DEFAULT_MIN_SLOTS,
  FILTER_DEBOUNCE_MS,
  PAGE_SIZE_OPTIONS,
  SORT_OPTIONS,
} from './projectsConfig'

function resultsLabel(total: number, filtered: boolean): string {
  if (filtered) return `${total} ${total === 1 ? 'resultado' : 'resultados'}`
  return `${total} ${total === 1 ? 'proyecto' : 'proyectos'}`
}

interface Props {
  /** Initial projects per page (a size picked earlier in the session wins). */
  pageSize?: number
  /** Card slots of space always reserved, even with fewer projects. */
  minSlots?: number
  /** Wait before querying after a filter changes. */
  filterDebounceMs?: number
}

export default function ProjectsPage({
  pageSize: initialPageSize = DEFAULT_PAGE_SIZE,
  minSlots = DEFAULT_MIN_SLOTS,
  filterDebounceMs = FILTER_DEBOUNCE_MS,
}: Props) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(() => loadPageSize() ?? initialPageSize)
  const [sort, setSort] = useState<ProjectSort>(() => loadSort() ?? DEFAULT_SORT)
  const [direction, setDirection] = useState<SortDirection>(
    () => loadDirection() ?? DEFAULT_DIRECTION[sort],
  )
  // `filters` drives the form; `applied` (debounced) drives the query.
  const [filters, setFilters] = useState<Filters>(() => loadFilters() ?? EMPTY_FILTERS)
  const [applied, setApplied] = useState<Filters>(filters)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filterTimer = useRef<number | undefined>(undefined)
  const headerRef = useRef<HTMLDivElement>(null)

  const { projects, pagination, loading, error } = useProjects({
    page,
    pageSize,
    sort,
    direction,
    filters: applied,
  })
  const filterOptions = useFilterOptions()

  useEffect(() => () => window.clearTimeout(filterTimer.current), [])

  const changeFilters = (next: Filters, immediate = false) => {
    setFilters(next)
    saveFilters(next)
    window.clearTimeout(filterTimer.current)
    const apply = () => {
      setApplied(next)
      setPage(1)
    }
    if (immediate || filterDebounceMs <= 0) apply()
    else filterTimer.current = window.setTimeout(apply, filterDebounceMs)
  }
  const clearFilters = () => changeFilters(EMPTY_FILTERS, true)

  const changePageSize = (size: number) => {
    setPageSize(size)
    setPage(1)
    savePageSize(size)
  }

  const changeSort = (value: string) => {
    const next = value as ProjectSort
    setSort(next)
    setDirection(DEFAULT_DIRECTION[next])
    setPage(1)
    saveSort(next)
    saveDirection(DEFAULT_DIRECTION[next])
  }

  const changeDirection = (next: SortDirection) => {
    setDirection(next)
    setPage(1)
    saveDirection(next)
  }

  const changePage = (next: number) => {
    setPage(next)
    const header = headerRef.current
    if (header && header.getBoundingClientRect().top < 0) {
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      header.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    }
  }

  // Keep the active size selectable even if it is not one of the presets.
  const sizeOptions = PAGE_SIZE_OPTIONS.includes(pageSize as (typeof PAGE_SIZE_OPTIONS)[number])
    ? PAGE_SIZE_OPTIONS
    : [...PAGE_SIZE_OPTIONS, pageSize].sort((a, b) => a - b)
  const sizeSelectOptions = sizeOptions.map((n) => ({ value: String(n), label: String(n) }))
  const reserved = `calc(${minSlots} * ${CARD_HEIGHT_REM}rem + ${Math.max(minSlots - 1, 0)} * ${CARD_GAP_REM}rem)`
  const activeFilters = countActiveFilters(filters)
  const filtered = countActiveFilters(applied) > 0

  return (
    <div className="mx-auto w-[94%] md:w-4/5">
      <div className="xl:grid xl:grid-cols-[18rem_minmax(0,1fr)] xl:items-start xl:gap-6">
        <aside className="xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto xl:p-1 xl:-m-1">
          <button
            type="button"
            aria-expanded={filtersOpen}
            aria-controls="project-filters"
            onClick={() => setFiltersOpen((o) => !o)}
            className="mb-5 flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm text-brand-primary ring-1 ring-black/5 hover:bg-brand-blush focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage xl:hidden"
          >
            Filtros{activeFilters > 0 && ` (${activeFilters})`}
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className={`size-4 stroke-brand-primary transition-transform motion-reduce:transition-none ${filtersOpen ? 'rotate-180' : ''}`}
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          <div id="project-filters" className={`${filtersOpen ? 'block' : 'hidden'} mb-5 xl:mb-0 xl:block`}>
            <ProjectFilters
              filters={filters}
              options={filterOptions.options}
              optionsLoading={filterOptions.loading}
              optionsError={filterOptions.error}
              onChange={(next) => changeFilters(next)}
              onClear={clearFilters}
            />
          </div>
        </aside>

        <div className="min-w-0">
          <PageHeader
            ref={headerRef}
            title="Proyectos"
            badge={
              <p
                role="status"
                title={pagination ? resultsLabel(pagination.total, filtered) : undefined}
                className={`translate-y-0.5 rounded-full bg-stone-200/70 px-2 py-0.5 text-xs font-medium text-stone-500 transition-opacity motion-reduce:transition-none ${
                  pagination ? '' : 'hidden'
                } ${loading ? 'opacity-50' : ''}`}
              >
                <span aria-hidden="true">{pagination?.total}</span>
                <span className="sr-only">{pagination ? resultsLabel(pagination.total, filtered) : ''}</span>
              </p>
            }
          >
            <div className="flex flex-wrap items-center justify-end gap-3">
              <div
                role="group"
                aria-label="Orden de proyectos"
                className="flex h-10 items-center rounded-full bg-white p-1 ring-1 ring-black/5"
              >
                <SortDirectionToggle value={direction} onChange={changeDirection} />
                <span aria-hidden="true" className="mx-1 h-5 w-px bg-stone-200" />
                <Select
                  bare
                  label="Ordenar proyectos"
                  value={sort}
                  options={SORT_OPTIONS}
                  onChange={changeSort}
                />
              </div>
              <Select
                label="Proyectos por página"
                icon={<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />}
                value={String(pageSize)}
                options={sizeSelectOptions}
                onChange={(v) => changePageSize(Number(v))}
              />
              <Pagination page={page} totalPages={pagination?.totalPages ?? 0} onChange={changePage} />
            </div>
          </PageHeader>

          {loading && projects.length === 0 && (
            <p className="py-24 text-center text-stone-500">Cargando proyectos…</p>
          )}
          {error && (
            <p role="alert" className="py-24 text-center text-red-700">
              No se pudieron cargar los proyectos: {error}
            </p>
          )}
          {!loading && !error && projects.length === 0 && (
            <div className="py-24 text-center text-stone-500">
              {filtered ? (
                <>
                  <p>Ningún proyecto coincide con los filtros</p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-3 rounded-full px-4 py-1.5 text-sm text-brand-primary underline hover:bg-brand-blush/70 focus-visible:outline-2 focus-visible:outline-brand-sage"
                  >
                    Limpiar filtros
                  </button>
                </>
              ) : (
                <p>Aún no hay proyectos</p>
              )}
            </div>
          )}
          <AnimatedHeight>
            <ul
              data-testid="projects-list"
              aria-busy={loading}
              style={projects.length > 0 ? ({ '--reserved': reserved } as CSSProperties) : undefined}
              className={`space-y-5 transition-[opacity,translate] ease-out motion-reduce:translate-y-0 motion-reduce:transition-none ${
                projects.length > 0 ? 'sm:min-h-(--reserved) ' : ''
              }${
                loading ? 'translate-y-1.5 opacity-0 duration-150' : 'translate-y-0 opacity-100 duration-200'
              }`}
            >
              {projects.map((project) => (
                <li key={project.id}>
                  <ProjectCard project={project} />
                </li>
              ))}
            </ul>
          </AnimatedHeight>
        </div>
      </div>
    </div>
  )
}
