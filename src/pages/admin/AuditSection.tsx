import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import FormSelect from '../../components/FormSelect'
import Pagination from '../../components/Pagination'
import { useUsers } from '../../hooks/useUsers'
import { AUDIT_ACTIONS, PAGE_SIZES, listAuditLog, type AuditEntry } from '../../services/auditLog'
import { roleLabel, userLabel, type Role } from '../../services/adminUsers'
import { ghostButton, inputClass } from './styles'
import { Empty, LoadError, Loading } from './ui'

const FIELDS = [
  'name', 'responsible', 'description', 'details', 'started_at', 'country', 'region', 'city', 'phone', 'mail', 'status', 'title', 'kind',
  'languages', 'image_path', 'exact_lat', 'exact_lng', 'first_name', 'last_name', 'language', 'role', 'banned_until', 'contact',
  'requested_by', 'added', 'removed', 'email', 'roles', 'household', 'testimony', 'home_country', 'home_description',
  'show_on_map', 'subject', 'permission', 'name_es', 'name_en', 'system', 'requestable', 'position', 'active', 'category',
  'message', 'profile_user_id',
] as const
type Field = (typeof FIELDS)[number]
const isField = (key: string): key is Field => (FIELDS as readonly string[]).includes(key)

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/

interface Filters {
  actorId: string
  action: string
  from: string
  to: string
}
/** WebKit top-aligns and indents the text of a date field: one line as tall as the box, no inner padding. */
const dateClass = `${inputClass} mt-1 block w-40 py-0 leading-10 [&::-webkit-datetime-edit]:p-0 [&::-webkit-datetime-edit-fields-wrapper]:p-0`

const NO_FILTERS: Filters = { actorId: '', action: '', from: '', to: '' }

/** A seeded role in the current language; one created by an admin shows its id. */
const roleName = (id: string) => (SEEDED_ROLES.includes(id) ? roleLabel(id as Role) : id)
const SEEDED_ROLES = ['subscriber', 'creator', 'validator', 'admin']

function Changes({ entry, names }: { entry: AuditEntry; names: (id: string) => string }) {
  const { t, i18n } = useTranslation('admin')
  const when = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })
  const keys = [...new Set([...Object.keys(entry.before ?? {}), ...Object.keys(entry.after ?? {})])]
  if (keys.length === 0) return <p className="text-sm text-stone-500">{t('audit.noDetails')}</p>

  const show = (key: string, value: unknown): string => {
    if (value === null || value === undefined || value === '') return t('audit.empty')
    if (key === 'role' && typeof value === 'string') return roleName(value)
    if ((key === 'requested_by' || key === 'profile_user_id') && typeof value === 'string') return names(value)
    if (key === 'roles' && Array.isArray(value) && value.length) return value.map((r) => roleName(String(r))).join(', ')
    if (Array.isArray(value)) return value.length ? value.join(', ') : t('audit.empty')
    if (typeof value === 'string' && ISO.test(value)) return when.format(new Date(value))
    return typeof value === 'object' ? JSON.stringify(value) : String(value)
  }

  return (
    <div className="grid gap-x-4 gap-y-2 sm:grid-cols-[10rem_minmax(0,1fr)_minmax(0,1fr)]">
      <div aria-hidden="true" className="hidden text-xs font-medium uppercase tracking-wide text-stone-400 sm:contents">
        <span />
        <span>{t('audit.before')}</span>
        <span>{t('audit.after')}</span>
      </div>
      <dl className="contents">
      {keys.map((key) => (
        <div key={key} className="contents">
          <dt className="font-medium text-stone-700">{isField(key) ? t(`audit.fields.${key}`) : key}</dt>
          <dd className="min-w-0 break-words text-stone-500">
            <span className="text-xs text-stone-400 sm:hidden">{t('audit.before')}: </span>
            {show(key, entry.before?.[key])}
          </dd>
          <dd className="min-w-0 break-words text-stone-800">
            <span className="text-xs text-stone-400 sm:hidden">{t('audit.after')}: </span>
            {show(key, entry.after?.[key])}
          </dd>
        </div>
      ))}
      </dl>
    </div>
  )
}

/** "Auditoría": who did what and when, newest first. The trail is written by the database; this only reads it. */
export default function AuditSection() {
  const { t, i18n } = useTranslation('admin')
  const { users } = useUsers()
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0])
  const [result, setResult] = useState<{ entries: AuditEntry[]; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const [open, setOpen] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    listAuditLog({ page, pageSize, ...filters }).then(
      (r) => {
        if (cancelled) return
        setResult(r)
        setError(null)
      },
      (e: unknown) => !cancelled && setError(e instanceof Error ? e.message : t('error')),
    )
    return () => {
      cancelled = true
    }
  }, [page, pageSize, filters, version, t])

  const labels = useMemo(() => new Map(users.map((u) => [u.id, userLabel(u)])), [users])
  const names = (id: string) => labels.get(id) ?? t('audit.system')
  const who = (e: AuditEntry) => (e.actorId ? (labels.get(e.actorId) ?? e.actorEmail ?? t('audit.system')) : t('audit.system'))
  const when = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })

  const change = (patch: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...patch }))
    setPage(1)
    setOpen(null)
  }
  const filtered = Object.values(filters).some(Boolean)

  if (error && !result) return <LoadError message={error} onRetry={() => setVersion((v) => v + 1)} />
  const totalPages = Math.max(Math.ceil((result?.total ?? 0) / pageSize), 1)

  return (
    <section aria-label={t('audit.list')} className="flex flex-col gap-4">
      <div role="group" aria-label={t('audit.filters')} className="flex flex-wrap items-end gap-3">
        <label className="block text-sm text-stone-600">
          {t('audit.actor')}
          <FormSelect value={filters.actorId} onChange={(e) => change({ actorId: e.target.value })} className={`${inputClass} mt-1 w-full sm:w-52`}>
            <option value="">{t('audit.anyActor')}</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {userLabel(u)}
              </option>
            ))}
          </FormSelect>
        </label>
        <label className="block text-sm text-stone-600">
          {t('audit.action')}
          <FormSelect value={filters.action} onChange={(e) => change({ action: e.target.value })} className={`${inputClass} mt-1 w-full sm:w-60`}>
            <option value="">{t('audit.anyAction')}</option>
            {AUDIT_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {t(`audit.actions.${a}`)}
              </option>
            ))}
          </FormSelect>
        </label>
        <label className="block text-sm text-stone-600">
          {t('audit.from')}
          <input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => change({ from: e.target.value })} className={dateClass} />
        </label>
        <label className="block text-sm text-stone-600">
          {t('audit.to')}
          <input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => change({ to: e.target.value })} className={dateClass} />
        </label>
        {filtered && (
          <button type="button" onClick={() => change(NO_FILTERS)} className={ghostButton}>
            {t('audit.clear')}
          </button>
        )}
      </div>

      {!result ? (
        <Loading />
      ) : result.entries.length === 0 ? (
        <Empty>{filtered ? t('audit.none') : t('audit.noneAtAll')}</Empty>
      ) : (
        <>
          <ul className="divide-y divide-stone-100 rounded-2xl bg-white shadow ring-1 ring-black/5">
            {result.entries.map((e) => {
              const expanded = open === e.id
              const known = (AUDIT_ACTIONS as readonly string[]).includes(e.action)
              return (
                <li key={e.id} className="flex flex-col gap-3 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-brand-primary">
                        {known ? t(`audit.actions.${e.action as (typeof AUDIT_ACTIONS)[number]}`) : t('audit.unknownAction')}
                        {e.entityLabel && <span className="font-normal text-stone-600">: {e.entityLabel}</span>}
                      </h3>
                      <p className="mt-1 text-xs text-stone-500">
                        {t('audit.by', { who: who(e) })} · <time dateTime={e.createdAt}>{when.format(new Date(e.createdAt))}</time>
                      </p>
                    </div>
                    {(e.before || e.after) && (
                      <button type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : e.id)} className={`${ghostButton} shrink-0`}>
                        {expanded ? t('audit.hide') : t('audit.details')}
                      </button>
                    )}
                  </div>
                  {expanded && (
                    <div className="border-t border-stone-100 pt-3">
                      <Changes entry={e} names={names} />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-stone-500">{t('audit.total', { count: result.total })}</p>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-stone-600">
                {t('audit.pageSize')}
                <FormSelect
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setPage(1)
                    setOpen(null)
                  }}
                  className={`${inputClass} w-20`}
                >
                  {PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </FormSelect>
              </label>
              {totalPages > 1 && <Pagination page={Math.min(page, totalPages)} totalPages={totalPages} onChange={(p) => { setPage(p); setOpen(null) }} />}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
