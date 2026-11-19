import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import Pagination from '../../components/Pagination'
import Select from '../../components/Select'
import { STATUS_META, useStatusLabel } from '../../components/projectStatus'
import { useAdminEditProjectId, useAdminNewProject } from '../../hooks/useRoute'
import { useUsers } from '../../hooks/useUsers'
import { ADMIN_NEW_PROJECT_URL, ADMIN_PROJECTS_URL, adminEditUrl, projectUrl } from '../../services/editOrigin'
import {
  ADMIN_PAGE_SIZES,
  loadAdminPageSize,
  loadAdminSort,
  saveAdminPageSize,
  saveAdminSort,
  type AdminProjectSort,
  type AdminProjectSortKey,
} from '../../services/adminProjectsView'
import { deleteProjectWithImages, listAdminProjects, type AdminProject } from '../../services/projectAdmin'
import { showToast } from '../../services/toast'
import type { Project } from '../../types'
import ProjectCreator from '../../components/ProjectCreator'
import ProjectEditor from '../../components/ProjectEditor'
import ProjectModal from './ProjectModal'
import { ConfirmButton, Empty, LoadError, Loading, SearchBox } from './ui'
import { ghostButton, matches, primaryButton } from './styles'

/**
 * The table adapts to the width of its own panel (container queries), not of the screen:
 *  - under 48rem each row is a compact card;
 *  - from 48rem: Proyecto, Estado, Creador and the actions (the place goes under the name);
 *  - from 64rem: + Lugar; from 72rem: + Actualizado.
 * `show` hides a column where it has no room of its own.
 */
const COLUMNS: readonly { id: AdminProjectSortKey; label: string; show: string }[] = [
  { id: 'name', label: 'Proyecto', show: '' },
  { id: 'status', label: 'Estado', show: '' },
  { id: 'place', label: 'Lugar', show: '@3xl:@max-5xl:hidden' },
  { id: 'creator', label: 'Creador', show: '' },
  { id: 'updated', label: 'Actualizado', show: '@3xl:@max-6xl:hidden' },
]
/** Actions are fixed in width, so the columns line up even while a row asks to confirm a deletion. */
const GRID_MEDIUM = 'minmax(0,1fr) 6rem minmax(0,11rem) 13rem'
const GRID_LARGE = 'minmax(0,2fr) 6rem minmax(0,1.3fr) minmax(0,1.2fr) 13rem'
const GRID_XLARGE = 'minmax(0,2fr) 6rem minmax(0,1.3fr) minmax(0,1.2fr) 7rem 13rem'
const ROW =
  'grid gap-x-4 gap-y-1 @3xl:[grid-template-columns:var(--cols-m)] @5xl:[grid-template-columns:var(--cols-l)] @6xl:[grid-template-columns:var(--cols-xl)]'
const updatedFormat = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' })

/** A value in the row; in the compact card it carries its own label, in the table the header does (screen readers always get it). */
function Cell({ label, strong = false, className = '', children }: { label: string; strong?: boolean; className?: string; children: ReactNode }) {
  return (
    <p className={`min-w-0 truncate text-sm ${strong ? 'text-stone-900' : 'text-stone-500'} ${className}`}>
      <span className="text-stone-400 @3xl:sr-only">{label}: </span>
      {children}
    </p>
  )
}

/** Leaves the form over the list (replacing the entry, so Back does not reopen it). */
const closeModal = () => window.location.replace(ADMIN_PROJECTS_URL)

const PAGE_SIZE_OPTIONS = ADMIN_PAGE_SIZES.map((n) => ({ value: String(n), label: String(n) }))

const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true })

/** The row as the admin edits it, from what the form saved. */
const toRow = (p: Project): AdminProject => ({
  id: p.id,
  name: p.name,
  status: p.status,
  country: p.country,
  region: p.region,
  created_by: p.created_by,
  updated_at: p.updated_at,
})

const placeOf = (p: AdminProject) => [p.region, p.country].filter(Boolean).join(', ')

/** "Proyectos": the whole catalog in a compact list, with owner assignment and removal. */
export default function ProjectsAdminSection() {
  const statusLabel = useStatusLabel()
  const { nameOf } = useUsers()
  const [projects, setProjects] = useState<AdminProject[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<AdminProjectSort>(loadAdminSort)
  const [pageSize, setPageSize] = useState(loadAdminPageSize)
  const editId = useAdminEditProjectId()
  const creating = useAdminNewProject()
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listAdminProjects().then(
      (list) => {
        if (cancelled) return
        setProjects(list)
        setError(null)
      },
      () => !cancelled && setError('No se pudieron cargar los proyectos. Inténtalo de nuevo.'),
    )
    return () => {
      cancelled = true
    }
  }, [version])

  const sorted = useMemo(() => {
    const value = (p: AdminProject) =>
      sort.key === 'name' ? p.name : sort.key === 'status' ? statusLabel(p.status) : sort.key === 'place' ? placeOf(p) : sort.key === 'creator' ? nameOf(p.created_by ?? null) : p.updated_at
    const list = [...(projects ?? [])].sort((a, b) => collator.compare(value(a), value(b)) || collator.compare(a.name, b.name))
    return sort.descending ? list.reverse() : list
  }, [projects, sort, nameOf, statusLabel])

  function sortBy(key: AdminProjectSortKey) {
    const next = { key, descending: sort.key === key ? !sort.descending : false }
    setSort(next)
    saveAdminSort(next)
    setPage(1)
  }

  async function remove(project: AdminProject) {
    setBusy(project.id)
    try {
      await deleteProjectWithImages(project.id)
      setProjects((list) => (list ?? []).filter((p) => p.id !== project.id))
      showToast('Proyecto eliminado')
    } catch {
      showToast('No se pudo eliminar el proyecto')
    }
    setBusy(null)
  }

  if (error && !projects) return <LoadError message={error} onRetry={() => setVersion((v) => v + 1)} />
  if (!projects) return <Loading />

  const filtered = query.trim() ? sorted.filter((p) => matches(`${p.name} ${p.country ?? ''} ${p.region ?? ''}`, query)) : sorted
  const totalPages = Math.max(Math.ceil(filtered.length / pageSize), 1)
  const current = Math.min(page, totalPages)
  const shown = filtered.slice((current - 1) * pageSize, current * pageSize)

  return (
    <section aria-label="Proyectos" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <SearchBox
          label="Buscar proyecto"
          value={query}
          onChange={(v) => {
            setQuery(v)
            setPage(1)
          }}
        />
        <div className="flex items-center gap-3">
          <Select
            label="Proyectos por página"
            icon={<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />}
            value={String(pageSize)}
            options={PAGE_SIZE_OPTIONS}
            onChange={(v) => {
              const size = Number(v)
              setPageSize(size)
              saveAdminPageSize(size)
              setPage(1)
            }}
          />
          <a href={ADMIN_NEW_PROJECT_URL} className={primaryButton}>
            Nuevo proyecto
          </a>
        </div>
      </div>

      {shown.length === 0 ? (
        <Empty>{projects.length === 0 ? 'Aún no hay proyectos.' : 'Ningún proyecto coincide con la búsqueda.'}</Empty>
      ) : (
        <div className="@container">
        <div
          style={{ '--cols-m': GRID_MEDIUM, '--cols-l': GRID_LARGE, '--cols-xl': GRID_XLARGE, '--rows': Math.min(pageSize, filtered.length) } as CSSProperties}
          className="flex flex-col overflow-hidden rounded-2xl bg-white shadow ring-1 ring-black/10"
        >
          <div className={`${ROW} hidden border-b border-stone-100 bg-stone-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-stone-500 @3xl:grid`}>
            {COLUMNS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => sortBy(c.id)}
                aria-label={`Ordenar por ${c.label}${sort.key === c.id ? (sort.descending ? ', de mayor a menor' : ', de menor a mayor') : ''}`}
                className={`${c.show} inline-flex min-w-0 items-center gap-1 text-left uppercase tracking-wide hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-brand-sage`}
              >
                <span className="truncate">{c.label}</span>
                <span aria-hidden="true" className={sort.key === c.id ? 'text-brand-primary' : 'opacity-0'}>
                  {sort.descending && sort.key === c.id ? '↓' : '↑'}
                </span>
              </button>
            ))}
            <span />
          </div>
          <ul className="flex-1 divide-y divide-stone-100 @3xl:min-h-[calc(var(--rows)*3.75rem)]">
            {shown.map((p) => {
              const status = STATUS_META[p.status]
              const place = placeOf(p)
              const updated = new Date(p.updated_at)
              return (
                <li key={p.id} className={`${ROW} items-center px-4 py-3 hover:bg-stone-50 @3xl:min-h-15`}>
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${status.dot}`} />
                      <h3 className="min-w-0 truncate text-sm text-brand-primary">
                        <a href={projectUrl(p.id, 'admin')} className="hover:underline focus-visible:outline-2 focus-visible:outline-brand-sage">
                          {p.name}
                        </a>
                      </h3>
                    </div>
                    {/* Without a column of its own, the place goes under the name. */}
                    {place && <p className="hidden truncate pl-5 text-xs text-stone-400 @3xl:@max-5xl:block">{place}</p>}
                  </div>
                  {/* A card: the values run together in lines. A table: each one is a cell of the grid. */}
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 @3xl:contents">
                    <Cell label="Estado">{statusLabel(p.status)}</Cell>
                    <Cell label="Lugar" className={COLUMNS[2].show}>
                      {place || '—'}
                    </Cell>
                    <Cell label="Creador" strong>
                      {nameOf(p.created_by ?? null)}
                    </Cell>
                    <Cell label="Actualizado" className={COLUMNS[4].show}>
                      {Number.isNaN(updated.getTime()) ? '—' : updatedFormat.format(updated)}
                    </Cell>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 @3xl:justify-end">
                    <a href={adminEditUrl(p.id)} className={ghostButton}>
                      Editar
                    </a>
                    <ConfirmButton label="Eliminar" confirmLabel="Sí, eliminar" disabled={busy !== null} onConfirm={() => remove(p)} />
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-t border-stone-200 bg-stone-50 px-4 py-2.5">
            <p className="text-sm text-stone-500">
              {(current - 1) * pageSize + 1}–{(current - 1) * pageSize + shown.length} de {filtered.length}
            </p>
            {totalPages > 1 && <Pagination page={current} totalPages={totalPages} onChange={setPage} />}
          </div>
        </div>
        </div>
      )}
      {editId ? (
        <ProjectModal label="Editar proyecto" onClose={closeModal}>
          <ProjectEditor
            key={editId}
            id={editId}
            onCancel={closeModal}
            onSaved={(saved) => {
              // The row changes in place: the list is not read again.
              setProjects((list) => (list ?? []).map((p) => (p.id === saved.id ? toRow(saved) : p)))
              closeModal()
              showToast('Proyecto actualizado')
            }}
          />
        </ProjectModal>
      ) : (
        creating && (
          <ProjectModal label="Nuevo proyecto" onClose={closeModal}>
            <ProjectCreator
              onCancel={closeModal}
              onCreated={(created) => {
                setProjects((list) => [...(list ?? []), toRow(created)])
                closeModal()
                showToast('Proyecto creado')
              }}
            />
          </ProjectModal>
        )
      )}
    </section>
  )
}
