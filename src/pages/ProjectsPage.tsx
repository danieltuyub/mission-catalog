import { useRef, useState, type CSSProperties } from 'react'
import AnimatedHeight from '../components/AnimatedHeight'
import Pagination from '../components/Pagination'
import ProjectCard from '../components/ProjectCard'
import Select from '../components/Select'
import SortDirectionToggle from '../components/SortDirectionToggle'
import { useProjects } from '../hooks/useProjects'
import {
  DEFAULT_DIRECTION,
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORT,
  type ProjectSort,
  type SortDirection,
} from '../services/projectService'
import {
  loadDirection,
  loadPageSize,
  loadSort,
  savePageSize,
  saveDirection,
  saveSort,
} from '../services/projectsViewStorage'
import {
  CARD_GAP_REM,
  CARD_HEIGHT_REM,
  DEFAULT_MIN_SLOTS,
  PAGE_SIZE_OPTIONS,
  SORT_OPTIONS,
} from './projectsConfig'

interface Props {
  /** Initial projects per page (a size picked earlier in the session wins). */
  pageSize?: number
  /** Card slots of space always reserved, even with fewer projects. */
  minSlots?: number
}

export default function ProjectsPage({
  pageSize: initialPageSize = DEFAULT_PAGE_SIZE,
  minSlots = DEFAULT_MIN_SLOTS,
}: Props) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(() => loadPageSize() ?? initialPageSize)
  const [sort, setSort] = useState<ProjectSort>(() => loadSort() ?? DEFAULT_SORT)
  const [direction, setDirection] = useState<SortDirection>(
    () => loadDirection() ?? DEFAULT_DIRECTION[sort],
  )
  const { projects, pagination, loading, error } = useProjects(page, pageSize, sort, direction)
  const headerRef = useRef<HTMLDivElement>(null)

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

  return (
    <div className="mx-auto w-[94%] md:w-4/5">
      <div ref={headerRef} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 pb-5">
        <h1 className="text-2xl font-semibold text-brand-primary">Proyectos</h1>
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
      </div>

      {loading && projects.length === 0 && (
        <p className="py-24 text-center text-stone-500">Cargando proyectos…</p>
      )}
      {error && (
        <p role="alert" className="py-24 text-center text-red-700">
          No se pudieron cargar los proyectos: {error}
        </p>
      )}
      {!loading && !error && projects.length === 0 && (
        <p className="py-24 text-center text-stone-500">Aún no hay proyectos</p>
      )}
      <AnimatedHeight>
      <ul
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
  )
}
