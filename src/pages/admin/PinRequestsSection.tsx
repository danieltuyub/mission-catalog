import { useCallback, useEffect, useState } from 'react'
import { useUsers } from '../../hooks/useUsers'
import { approveRequest, listAllRequests, rejectRequest } from '../../services/pinRequests'
import { showToast } from '../../services/toast'
import type { PinRequest } from '../../types'
import { RequestImage } from '../account/RequestsSection'
import { Chips, ConfirmButton, Empty, LoadError, Loading } from './ui'
import { card, dateFormat, primaryButton } from './styles'

type Filter = 'pending' | 'reviewed'

const STATUS_CHIP = {
  approved: { label: 'Aprobada', chip: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rechazada', chip: 'bg-red-100 text-red-800' },
} as const

/** "Solicitudes de pines": what members propose. Approving publishes the pin on the map. */
export default function PinRequestsSection() {
  const { nameOf } = useUsers()
  const [requests, setRequests] = useState<PinRequest[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('pending')
  const [busy, setBusy] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const reload = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    let cancelled = false
    listAllRequests().then(
      (list) => {
        if (cancelled) return
        setRequests(list)
        setError(null)
      },
      (e: unknown) => !cancelled && setError(e instanceof Error ? e.message : 'Error'),
    )
    return () => {
      cancelled = true
    }
  }, [version])

  async function review(request: PinRequest, action: 'approve' | 'reject') {
    setBusy(request.id)
    try {
      if (action === 'approve') await approveRequest(request)
      else await rejectRequest(request.id)
      setRequests((list) =>
        (list ?? []).map((r) => (r.id === request.id ? { ...r, status: action === 'approve' ? 'approved' : 'rejected' } : r)),
      )
      showToast(action === 'approve' ? 'Pin publicado en el mapa' : 'Solicitud rechazada')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'No se pudo completar la acción')
      // Someone else may have reviewed it: show what is true now.
      reload()
    }
    setBusy(null)
  }

  if (error && !requests) return <LoadError message={error} onRetry={reload} />
  if (!requests) return <Loading />

  const pending = requests.filter((r) => r.status === 'pending')
  const reviewed = requests.filter((r) => r.status !== 'pending')
  const shown = filter === 'pending' ? pending : reviewed

  return (
    <section aria-label="Solicitudes de pines" className="space-y-4">
      <Chips
        label="Estado"
        value={filter}
        onChange={setFilter}
        options={[
          { id: 'pending', label: 'Pendientes', count: pending.length },
          { id: 'reviewed', label: 'Revisadas', count: reviewed.length },
        ]}
      />
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
