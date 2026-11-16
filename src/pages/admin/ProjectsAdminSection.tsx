import { useEffect, useMemo, useState } from 'react'
import Pagination from '../../components/Pagination'
import { STATUS_META } from '../../components/projectStatus'
import { useUsers } from '../../hooks/useUsers'
import { editUrl, projectUrl } from '../../services/editOrigin'
import { assignProjectCreator, deleteProjectWithImages, listAdminProjects, type AdminProject } from '../../services/projectAdmin'
import { showToast } from '../../services/toast'
import { ConfirmButton, Empty, LoadError, Loading, SearchBox } from './ui'
import { card, ghostButton, inputClass, matches, primaryButton } from './styles'

const PAGE_SIZE = 10
const NONE = ''

/** "Proyectos": the whole catalog in a compact list, with owner assignment and removal. */
export default function ProjectsAdminSection() {
  const { users, nameOf } = useUsers()
  const [projects, setProjects] = useState<AdminProject[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
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

  // Who can own a project: creators and admins.
  const owners = useMemo(() => users.filter((u) => u.role === 'creator' || u.role === 'admin'), [users])

  async function assign(project: AdminProject, userId: string) {
    setBusy(project.id)
    try {
      await assignProjectCreator(project.id, userId || null)
      setProjects((list) => (list ?? []).map((p) => (p.id === project.id ? { ...p, created_by: userId || null } : p)))
      showToast('Creador actualizado')
    } catch {
      showToast('No se pudo asignar el creador')
    }
    setBusy(null)
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

  const filtered = query.trim() ? projects.filter((p) => matches(`${p.name} ${p.country ?? ''} ${p.region ?? ''}`, query)) : projects
  const totalPages = Math.max(Math.ceil(filtered.length / PAGE_SIZE), 1)
  const current = Math.min(page, totalPages)
  const shown = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

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
          {totalPages > 1 && <Pagination page={current} totalPages={totalPages} onChange={setPage} />}
          <a href="#/proyectos/nuevo?from=admin" className={primaryButton}>
            Nuevo proyecto
          </a>
        </div>
      </div>

      {shown.length === 0 ? (
        <Empty>{projects.length === 0 ? 'Aún no hay proyectos.' : 'Ningún proyecto coincide con la búsqueda.'}</Empty>
      ) : (
        <ul className="space-y-3">
          {shown.map((p) => {
            const status = STATUS_META[p.status]
            const unknownOwner = p.created_by && !owners.some((o) => o.id === p.created_by)
            return (
              <li key={p.id} className={`${card} space-y-3`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <h3 className="min-w-0 truncate font-semibold text-brand-primary">
                      <a href={projectUrl(p.id, 'admin')} className="hover:underline focus-visible:outline-2 focus-visible:outline-brand-sage">
                        {p.name}
                      </a>
                    </h3>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${status.chip}`}>{status.label}</span>
                  </div>
                  <p className="text-xs text-stone-400">{[p.region, p.country].filter(Boolean).join(', ') || '—'}</p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm text-stone-600">
                    Creador
                    <select
                      aria-label={`Creador de ${p.name}`}
                      value={p.created_by ?? NONE}
                      disabled={busy !== null}
                      onChange={(e) => assign(p, e.target.value)}
                      className={`${inputClass} max-w-56`}
                    >
                      <option value={NONE}>Sin asignar</option>
                      {unknownOwner && <option value={p.created_by!}>{nameOf(p.created_by!)}</option>}
                      {owners.map((u) => (
                        <option key={u.id} value={u.id}>
                          {nameOf(u.id)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <a href={editUrl(p.id, 'admin')} className={ghostButton}>
                      Editar
                    </a>
                    <ConfirmButton label="Eliminar" confirmLabel="Sí, eliminar" disabled={busy !== null} onConfirm={() => remove(p)} />
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
