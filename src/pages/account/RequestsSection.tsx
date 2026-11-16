import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { listMyRequests, MAX_PENDING_REQUESTS, requestImageUrl } from '../../services/pinRequests'
import type { PinRequest, PinRequestStatus } from '../../types'

const STATUS: Record<PinRequestStatus, { label: string; chip: string }> = {
  pending: { label: 'Pendiente', chip: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Aprobada', chip: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rechazada', chip: 'bg-red-100 text-red-800' },
}

const dateFormat = new Intl.DateTimeFormat('es', { dateStyle: 'long' })

/** The private image, through a link that expires: no picture when it cannot be loaded. */
export function RequestImage({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    requestImageUrl(path).then(
      (signed) => !cancelled && setUrl(signed),
      () => {},
    )
    return () => {
      cancelled = true
    }
  }, [path])
  return (
    <div aria-hidden="true" className="size-20 shrink-0 overflow-hidden rounded-xl bg-stone-200">
      {url && <img src={url} alt="" loading="lazy" className="size-full object-cover" />}
    </div>
  )
}

function RequestItem({ request }: { request: PinRequest }) {
  const status = STATUS[request.status]
  return (
    <li className="flex gap-4 rounded-2xl bg-white p-4 shadow ring-1 ring-black/5">
      {request.image_path && <RequestImage path={request.image_path} />}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 title={request.title} className="min-w-0 truncate font-semibold text-brand-primary">
            {request.title}
          </h3>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${status.chip}`}>{status.label}</span>
        </div>
        {request.description && <p className="mt-1 line-clamp-2 text-sm text-stone-500">{request.description}</p>}
        <p className="mt-2 text-xs text-stone-400">
          Enviada el {dateFormat.format(new Date(request.created_at))} · {request.lat.toFixed(4)}, {request.lng.toFixed(4)}
        </p>
      </div>
    </li>
  )
}

/** "Solicitudes de pines": what the user asked for and where each request stands. */
export default function RequestsSection() {
  const { userId } = useAuth()
  const [result, setResult] = useState<{ userId: string; requests: PinRequest[] | null; error: string | null } | null>(null)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    listMyRequests(userId).then(
      (requests) => !cancelled && setResult({ userId, requests, error: null }),
      (e: unknown) => !cancelled && setResult({ userId, requests: null, error: e instanceof Error ? e.message : 'Error' }),
    )
    return () => {
      cancelled = true
    }
  }, [userId])

  const current = result?.userId === userId ? result : null
  if (!current) return <p className="py-10 text-center text-stone-500">Cargando…</p>
  if (current.error)
    return (
      <p role="alert" className="rounded-2xl bg-white p-6 text-sm text-red-700 shadow ring-1 ring-black/5">
        {current.error}
      </p>
    )

  const requests = current.requests ?? []
  const pending = requests.filter((r) => r.status === 'pending').length

  if (requests.length === 0)
    return (
      <div className="rounded-2xl bg-white p-6 text-stone-600 shadow ring-1 ring-black/5">
        <p>Aún no has enviado solicitudes de pines.</p>
        <p className="mt-1 text-sm text-stone-500">Usa «Solicitar pin» en el mapa para proponer un lugar.</p>
        <a
          href="#/mapa"
          className="mt-4 inline-flex h-10 items-center rounded-full bg-white px-4 text-sm text-brand-primary ring-1 ring-black/5 hover:bg-brand-blush focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage"
        >
          Ir al mapa
        </a>
      </div>
    )

  return (
    <section aria-label="Solicitudes de pines">
      <p className="mb-4 text-sm text-stone-500">
        {pending} de {MAX_PENDING_REQUESTS} solicitudes pendientes
      </p>
      <ul className="space-y-3">
        {requests.map((request) => (
          <RequestItem key={request.id} request={request} />
        ))}
      </ul>
    </section>
  )
}
