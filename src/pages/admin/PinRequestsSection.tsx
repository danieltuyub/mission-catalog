import { useCallback, useEffect, useState } from 'react'
import Pagination from '../../components/Pagination'
import { useUsers } from '../../hooks/useUsers'
import {
  approveRequest,
  countPendingRequests,
  countReviewedRequests,
  listRequestsPage,
  rejectRequest,
  REVIEW_PAGE_SIZE,
  type ReviewFilter,
} from '../../services/pinRequests'
import { showToast } from '../../services/toast'
import type { PinRequest } from '../../types'
import { RequestImage } from '../account/RequestsSection'
import { Chips, ConfirmButton, Empty, LoadError, Loading } from './ui'
import { card, dateFormat, primaryButton } from './styles'

const STATUS_CHIP = {
  approved: { label: 'Aprobada', chip: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rechazada', chip: 'bg-red-100 text-red-800' },
} as const

/** "Solicitudes de pines": what members propose. Approving publishes the pin on the map. */
export default function PinRequestsSection() {
  const { nameOf } = useUsers()
  const [filter, setFilter] = useState<ReviewFilter>('pending')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<{ requests: PinRequest[]; total: number; pending: number; reviewed: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const reload = useCallback(() => setVersion((v) => v + 1), [])

  // The page and the two chip counts come from the server; the previous page stays until the next arrives.
  useEffect(() => {
    let cancelled = false
    Promise.all([listRequestsPage(filter, page), countPendingRequests(), countReviewedRequests()]).then(
      ([{ requests, total }, pending, reviewed]) => {
        if (cancelled) return
        // Reviewing the last request of a page leaves it empty: step back.
        if (requests.length === 0 && page > 1) setPage(Math.max(Math.ceil(total / REVIEW_PAGE_SIZE), 1))
        else {
          setData({ requests, total, pending, reviewed })
          setError(null)
        }
      },
      (e: unknown) => !cancelled && setError(e instanceof Error ? e.message : 'Error'),
    )
    return () => {
      cancelled = true
    }
  }, [filter, page, version])

  async function review(request: PinRequest, action: 'approve' | 'reject') {
    setBusy(request.id)
    try {
      if (action === 'approve') await approveRequest(request)
      else await rejectRequest(request.id)
      showToast(action === 'approve' ? 'Pin publicado en el mapa' : 'Solicitud rechazada')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'No se pudo completar la acción')
    }
    // Moved to the other list, or reviewed by someone else already: show what is true now.
    reload()
    setBusy(null)
  }

  if (error && !data) return <LoadError message={error} onRetry={reload} />
  if (!data) return <Loading />

  const { requests: shown, total, pending, reviewed } = data
  const totalPages = Math.max(Math.ceil(total / REVIEW_PAGE_SIZE), 1)

  return (
    <section aria-label="Solicitudes de pines" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <Chips
          label="Estado"
          value={filter}
          onChange={(next) => {
            setFilter(next)
            setPage(1)
          }}
          options={[
            { id: 'pending', label: 'Pendientes', count: pending },
            { id: 'reviewed', label: 'Revisadas', count: reviewed },
          ]}
        />
        {totalPages > 1 && <Pagination page={Math.min(page, totalPages)} totalPages={totalPages} onChange={setPage} />}
      </div>
      {shown.length === 0 ? (
        <Empty>{filter === 'pending' ? 'No hay solicitudes pendientes.' : 'Aún no hay solicitudes revisadas.'}</Empty>
      ) : (
        <ul className="space-y-3">
          {shown.map((r) => (
            <li key={r.id} className={`${card} flex gap-4`}>
              {r.image_path && <RequestImage path={r.image_path} />}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 title={r.title} className="min-w-0 truncate font-semibold text-brand-primary">
                    {r.title}
                  </h3>
                  {r.status !== 'pending' && (
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${STATUS_CHIP[r.status].chip}`}>
                      {STATUS_CHIP[r.status].label}
                    </span>
                  )}
                </div>
                {r.description && <p className="mt-1 line-clamp-3 text-sm text-stone-500">{r.description}</p>}
                <p className="mt-2 text-xs text-stone-400">
                  {nameOf(r.requested_by)} · {dateFormat.format(new Date(r.created_at))} · {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                </p>
                {r.status === 'pending' && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button type="button" disabled={busy !== null} onClick={() => review(r, 'approve')} className={primaryButton}>
                      {busy === r.id ? 'Publicando…' : 'Aprobar'}
                    </button>
                    <ConfirmButton
                      label="Rechazar"
                      confirmLabel="Sí, rechazar"
                      disabled={busy !== null}
                      onConfirm={() => review(r, 'reject')}
                    />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
