import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Pagination from '../../components/Pagination'
import PinAttributeFields from '../../components/PinAttributeFields'
import PlaceFields from '../../components/PlaceFields'
import { useUsers } from '../../hooks/useUsers'
import {
  approveRequest,
  type PinEdits,
  countPendingRequests,
  countReviewedRequests,
  listRequestsPage,
  rejectRequest,
  REVIEW_PAGE_SIZE,
  type ReviewFilter,
} from '../../services/pinRequests'
import { isValidCountry } from '../../services/countries'
import { isPinKind } from '../../services/pinKinds'
import { canonicalPlace, placeLabel, type Place } from '../../services/pinPlace'
import { getPins } from '../../services/pinService'
import { showToast } from '../../services/toast'
import type { Pin, PinKind, PinRequest } from '../../types'
import { RequestImage } from '../account/RequestsSection'
import { Chips, ConfirmButton, Empty, LoadError, Loading } from './ui'
import { card, dateFormat, inputClass, primaryButton } from './styles'

const STATUS_CHIP = {
  approved: { chip: 'bg-green-100 text-green-800' },
  rejected: { chip: 'bg-red-100 text-red-800' },
} as const

/** Place to settle before approving (the requester's is the starting point), and the two decisions. */
function RequestReview({
  request,
  known,
  busy,
  onApprove,
  onReject,
}: {
  request: PinRequest
  known: Pin[]
  busy: string | null
  onApprove: (edits: PinEdits) => void
  onReject: () => void
}) {
  const { t } = useTranslation('admin')
  const [place, setPlace] = useState<Place>(request)
  const [attrs, setAttrs] = useState({ kind: request.kind ?? '', languages: request.languages })
  return (
    <div className="mt-3 space-y-3">
      <PlaceFields
        value={place}
        onChange={setPlace}
        known={known}
        currentCountry={request.country}
        className="grid gap-3 sm:grid-cols-3"
        labelClassName="block text-xs text-stone-500"
        inputClassName={`${inputClass} mt-1 w-full`}
      />
      <PinAttributeFields
        value={attrs}
        onChange={setAttrs}
        className="grid gap-3 sm:grid-cols-2"
        labelClassName="block text-xs text-stone-500"
        inputClassName={`${inputClass} mt-1 w-full bg-white`}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy !== null || !isValidCountry(place.country, request.country) || !isPinKind(attrs.kind)}
          onClick={() => onApprove({ ...canonicalPlace(place, known), kind: attrs.kind as PinKind, languages: attrs.languages })}
          className={primaryButton}
        >
          {busy === request.id ? t('requests.publishing') : t('requests.approve')}
        </button>
        <ConfirmButton label={t('requests.reject')} confirmLabel={t('requests.yesReject')} disabled={busy !== null} onConfirm={onReject} />
      </div>
    </div>
  )
}

/** "Solicitudes de pines": what members propose. Approving publishes the pin on the map. */
export default function PinRequestsSection() {
  const { t } = useTranslation('admin')
  const { nameOf } = useUsers()
  const [filter, setFilter] = useState<ReviewFilter>('pending')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<{ requests: PinRequest[]; total: number; pending: number; reviewed: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [known, setKnown] = useState<Pin[]>([])
  const [version, setVersion] = useState(0)
  const reload = useCallback(() => setVersion((v) => v + 1), [])

  // The places already in use are suggested (and their spelling kept).
  useEffect(() => {
    let cancelled = false
    getPins().then(
      (pins) => !cancelled && setKnown(pins),
      () => {},
    )
    return () => {
      cancelled = true
    }
  }, [])

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
      (e: unknown) => !cancelled && setError(e instanceof Error ? e.message : t('error')),
    )
    return () => {
      cancelled = true
    }
  }, [filter, page, version, t])

  async function review(request: PinRequest, action: 'approve' | 'reject', edits?: PinEdits) {
    setBusy(request.id)
    try {
      if (action === 'approve') await approveRequest(request, edits)
      else await rejectRequest(request.id)
      showToast(action === 'approve' ? t('requests.published') : t('requests.rejectedToast'))
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('requests.actionFailed'))
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
    <section aria-label={t('requests.label')} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <Chips
          label={t('requests.state')}
          value={filter}
          onChange={(next) => {
            setFilter(next)
            setPage(1)
          }}
          options={[
            { id: 'pending', label: t('requests.pending'), count: pending },
            { id: 'reviewed', label: t('requests.reviewed'), count: reviewed },
          ]}
        />
        {totalPages > 1 && <Pagination page={Math.min(page, totalPages)} totalPages={totalPages} onChange={setPage} />}
      </div>
      {shown.length === 0 ? (
        <Empty>{filter === 'pending' ? t('requests.nonePending') : t('requests.noneReviewed')}</Empty>
      ) : (
        <ul className="space-y-3">
          {shown.map((r) => (
            <li key={r.id} className={`${card} flex gap-4`}>
              {r.image_path && <RequestImage path={r.image_path} />}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 title={r.title} className="min-w-0 flex-1 truncate font-semibold text-brand-primary">
                    {r.title}
                  </h3>
                  {r.status !== 'pending' && (
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${STATUS_CHIP[r.status].chip}`}>
                      {t(`requests.${r.status}`)}
                    </span>
                  )}
                </div>
                {r.description && <p className="mt-1 line-clamp-3 text-sm text-stone-500">{r.description}</p>}
                <p className="mt-2 text-xs text-stone-400">
                  {nameOf(r.requested_by)} · {dateFormat.format(new Date(r.created_at))} · {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                  {r.status !== 'pending' && placeLabel(r) && ` · ${placeLabel(r)}`}
                </p>
                {r.status === 'pending' && (
                  <RequestReview
                    key={r.id}
                    request={r}
                    known={known}
                    busy={busy}
                    onApprove={(edits) => review(r, 'approve', edits)}
                    onReject={() => review(r, 'reject')}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
