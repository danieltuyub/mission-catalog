import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import Pagination from '../../components/Pagination'
import { STATUS_META } from '../../components/projectStatus'
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
import { ghostButton, inputClass, matches, primaryButton } from './styles'

/** One place for the columns: the header and the row grid follow it. Name comes first, actions last. */
const COLUMNS: readonly { id: AdminProjectSortKey; label: string; width: string }[] = [
  { id: 'name', label: 'Proyecto', width: 'minmax(0,2.2fr)' },
  { id: 'place', label: 'Lugar', width: 'minmax(0,1.3fr)' },
  { id: 'creator', label: 'Creador', width: 'minmax(0,1.3fr)' },
  { id: 'updated', label: 'Actualizado', width: '7rem' },
]
/** Fixed, so the columns line up from row to row even while a row asks to confirm a deletion. */
const ACTIONS_WIDTH = '13rem'
const GRID_COLUMNS = [...COLUMNS.map((c) => c.width), ACTIONS_WIDTH].join(' ')
const ROW = 'grid gap-x-4 gap-y-1 md:[grid-template-columns:var(--cols)]'
const updatedFormat = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' })

/** A value in the row; on small screens it carries its own label, on wide ones the header does (screen readers always get it). */
function Cell({ label, strong = false, children }: { label: string; strong?: boolean; children: ReactNode }) {
  return (
    <p className={`min-w-0 truncate text-sm ${strong ? 'text-stone-900' : 'text-stone-500'}`}>
      <span className="text-stone-400 md:sr-only">{label}: </span>
      {children}
    </p>
  )
}

/** Leaves the form over the list (replacing the entry, so Back does not reopen it). */
const closeModal = () => window.location.replace(ADMIN_PROJECTS_URL)

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
      sort.key === 'name' ? p.name : sort.key === 'place' ? placeOf(p) : sort.key === 'creator' ? nameOf(p.created_by ?? null) : p.updated_at
    const list = [...(projects ?? [])].sort((a, b) => collator.compare(value(a), value(b)) || collator.compare(a.name, b.name))
    return sort.descending ? list.reverse() : list
  }, [projects, sort, nameOf])

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
          <select
            aria-label="Proyectos por página"
            value={pageSize}
            onChange={(e) => {
              const size = Number(e.target.value)
              setPageSize(size)
              saveAdminPageSize(size)
              setPage(1)
            }}
            className={inputClass}
          >
            {ADMIN_PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n} por página
              </option>
            ))}
          </select>
          {totalPages > 1 && <Pagination page={current} totalPages={totalPages} onChange={setPage} />}
          <a href={ADMIN_NEW_PROJECT_URL} className={primaryButton}>
            Nuevo proyecto
          </a>
        </div>
      </div>

      {shown.length === 0 ? (
        <Empty>{projects.length === 0 ? 'Aún no hay proyectos.' : 'Ningún proyecto coincide con la búsqueda.'}</Empty>
      ) : (
        <div style={{ '--cols': GRID_COLUMNS } as CSSProperties} className="overflow-hidden rounded-2xl bg-white shadow ring-1 ring-black/5">
          <div className={`${ROW} hidden border-b border-stone-100 bg-stone-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-stone-500 md:grid`}>
            {COLUMNS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => sortBy(c.id)}
                aria-label={`Ordenar por ${c.label}${sort.key === c.id ? (sort.descending ? ', de mayor a menor' : ', de menor a mayor') : ''}`}
                className="inline-flex min-w-0 items-center gap-1 text-left uppercase tracking-wide hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-brand-sage"
              >
                <span className="truncate">{c.label}</span>
                <span aria-hidden="true" className={sort.key === c.id ? 'text-brand-primary' : 'opacity-0'}>
                  {sort.descending && sort.key === c.id ? '↓' : '↑'}
                </span>
              </button>
            ))}
            <span />
          </div>
          <ul className="divide-y divide-stone-100">
            {shown.map((p) => {
              const status = STATUS_META[p.status]
              const place = placeOf(p)
              const updated = new Date(p.updated_at)
              return (
                <li key={p.id} className={`${ROW} items-center px-4 py-3 hover:bg-stone-50`}>
                  <div className="flex min-w-0 items-center gap-2">
                    <h3 className="min-w-0 truncate font-medium text-brand-primary">
                      <a href={projectUrl(p.id, 'admin')} className="hover:underline focus-visible:outline-2 focus-visible:outline-brand-sage">
                        {p.name}
                      </a>
                    </h3>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.chip}`}>{status.label}</span>
                  </div>
                  <Cell label="Lugar">{place || '—'}</Cell>
                  <Cell label="Creador" strong>
                    {nameOf(p.created_by ?? null)}
                  </Cell>
                  <Cell label="Actualizado">{Number.isNaN(updated.getTime()) ? '—' : updatedFormat.format(updated)}</Cell>
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <a href={adminEditUrl(p.id)} className={ghostButton}>
                      Editar
                    </a>
                    <ConfirmButton label="Eliminar" confirmLabel="Sí, eliminar" disabled={busy !== null} onConfirm={() => remove(p)} />
                  </div>
                </li>
              )
            })}
          </ul>
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
