import { useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import Collapsible from '../../components/Collapsible'
import FormSelect from '../../components/FormSelect'
import Pagination from '../../components/Pagination'
import { useAuth } from '../../hooks/useAuth'
import { useUsers } from '../../hooks/useUsers'
import { LANGUAGES, LANGUAGE_NAMES, isLanguage, type Language } from '../../i18n'
import { INDEFINITE, ROLES, blockState, roleLabel, setUserBan, setUserLanguage, setUserRole, updateUserName, userLabel, type AdminUser, type Role } from '../../services/adminUsers'
import { showToast } from '../../services/toast'
import NewUserForm from './NewUserForm'
import { Empty, LoadError, Loading, SearchBox } from './ui'
import { card, dateFormat, ghostButton, inputClass, matches, primaryButton } from './styles'

const PAGE_SIZE = 10

const DAY = 86_400_000
/** What the "Acceso" field can ask for. `keep` only exists while the account is blocked. */
const ACCESS = [
  { id: 'none', key: 'users.active' },
  { id: '1d', key: 'users.d1', days: 1 },
  { id: '7d', key: 'users.d7', days: 7 },
  { id: '30d', key: 'users.d30', days: 30 },
  { id: 'forever', key: 'users.forever' },
] as const
type Access = 'keep' | (typeof ACCESS)[number]['id']

/** "until 5 Dec 2026" / "indefinitely", for a blocked account; null when it is active. */
function useBlockText(): (u: AdminUser) => string | null {
  const { t } = useTranslation('admin')
  return (u) => {
    const state = blockState(u)
    if (state.kind === 'active') return null
    return state.kind === 'indefinite' ? t('users.indefinitely') : t('users.until', { date: dateFormat.format(state.until) })
  }
}

function UserEditor({ user, self, onSaved, onCancel }: { user: AdminUser; self: boolean; onSaved: () => void; onCancel: () => void }) {
  const [first, setFirst] = useState(user.firstName)
  const [last, setLast] = useState(user.lastName)
  const [role, setRole] = useState<Role | ''>(user.role ?? '')
  const [language, setLanguageValue] = useState<Language | ''>(user.language ?? '')
  const { t } = useTranslation('admin')
  const blockText = useBlockText()
  const blocked = blockText(user)
  const [access, setAccess] = useState<Access>(blocked ? 'keep' : 'none')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      if (first !== user.firstName || last !== user.lastName) await updateUserName(user.id, first, last)
      if (role && role !== user.role) await setUserRole(user.id, role)
      if (language !== (user.language ?? '')) await setUserLanguage(user.id, language || null)
      if (access !== 'keep' && !(access === 'none' && !blocked)) {
        const choice = ACCESS.find((a) => a.id === access)
        const until =
          access === 'none' ? null : access === 'forever' ? new Date(INDEFINITE) : new Date(Date.now() + (choice && 'days' in choice ? choice.days : 1) * DAY)
        await setUserBan(user.id, until)
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('users.saveFailed'))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} aria-label={t('users.formAria', { email: user.email })} className="space-y-3 border-t border-stone-100 pt-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-sm text-stone-600">
          {t('users.firstName')}
          <input value={first} maxLength={80} onChange={(e) => setFirst(e.target.value)} className={`${inputClass} mt-1 w-full`} />
        </label>
        <label className="block text-sm text-stone-600">
          {t('users.lastName')}
          <input value={last} maxLength={80} onChange={(e) => setLast(e.target.value)} className={`${inputClass} mt-1 w-full`} />
        </label>
        <label className="block text-sm text-stone-600">
          {t('users.role')}
          <FormSelect
            value={role}
            disabled={self}
            title={self ? t('users.ownRole') : undefined}
            onChange={(e) => setRole(e.target.value as Role)}
            className={`${inputClass} mt-1 w-full`}
          >
            {!user.role && <option value="">{roleLabel(null)}</option>}
            {ROLES.map((r) => (
              <option key={r.id} value={r.id}>
                {roleLabel(r.id)}
              </option>
            ))}
          </FormSelect>
        </label>
        <label className="block text-sm text-stone-600">
          {t('users.access')}
          <FormSelect
            value={access}
            disabled={self}
            title={self ? t('users.ownBlock') : undefined}
            onChange={(e) => setAccess(e.target.value as Access)}
            className={`${inputClass} mt-1 w-full`}
          >
            {blocked && <option value="keep">{t('users.blocked', { when: blocked })}</option>}
            {ACCESS.map((a) => (
              <option key={a.id} value={a.id}>
                {blocked && a.id === 'none' ? t('users.reactivate') : t(a.key)}
              </option>
            ))}
          </FormSelect>
        </label>
        <label className="block text-sm text-stone-600">
          {t('users.language')}
          <FormSelect
            value={language}
            onChange={(e) => setLanguageValue(isLanguage(e.target.value) ? e.target.value : '')}
            className={`${inputClass} mt-1 w-full`}
          >
            <option value="">{t('users.languageNone')}</option>
            {LANGUAGES.map((l) => (
              <option key={l} value={l} lang={l}>
                {LANGUAGE_NAMES[l]}
              </option>
            ))}
          </FormSelect>
        </label>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className={primaryButton}>
          {saving ? t('users.saving') : t('users.save')}
        </button>
        <button type="button" onClick={onCancel} className={ghostButton}>
          {t('cancel')}
        </button>
      </div>
    </form>
  )
}

/** "Usuarios": create accounts, edit anyone's name or role, block accounts. Disabling accounts comes later. */
export default function UsersSection() {
  const { t } = useTranslation('admin')
  const blockText = useBlockText()
  const { userId } = useAuth()
  const { users, loading, error, reload } = useUsers()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const newUserButton = useRef<HTMLButtonElement>(null)

  /** Closing hands focus back to the button that opened the form. */
  function closeNewUser() {
    setCreating(false)
    requestAnimationFrame(() => newUserButton.current?.focus())
  }

  if (error && users.length === 0) return <LoadError message={error} onRetry={reload} />
  if (loading) return <Loading />

  const filtered = query.trim() ? users.filter((u) => matches(`${userLabel(u)} ${u.email}`, query)) : users
  const totalPages = Math.max(Math.ceil(filtered.length / PAGE_SIZE), 1)
  const current = Math.min(page, totalPages)
  const shown = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  return (
    <section aria-label={t('tabs.usuarios')} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <SearchBox
          label={t('users.search')}
          value={query}
          onChange={(v) => {
            setQuery(v)
            setPage(1)
          }}
        />
        <div className="flex items-center gap-3">
          {totalPages > 1 && <Pagination page={current} totalPages={totalPages} onChange={setPage} />}
          <button ref={newUserButton} type="button" onClick={() => setCreating(true)} disabled={creating} className={primaryButton}>
            {t('users.new')}
          </button>
        </div>
      </div>
      <Collapsible open={creating}>
        <NewUserForm onCreated={reload} onClose={closeNewUser} />
      </Collapsible>
      {shown.length === 0 ? (
        <Empty>{t('users.none')}</Empty>
      ) : (
        <ul className="space-y-3">
          {shown.map((u) => {
            const self = u.id === userId
            return (
              <li key={u.id} className={`${card} flex flex-col gap-4`}>
                {/* Phone: Edit stays top right, the badges go under the text. From sm: text, badges and Edit in one row. */}
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-3 sm:flex">
                  <div className="min-w-0 sm:flex-1">
                    <h3 className="truncate font-semibold text-brand-primary">
                      {userLabel(u)}
                      {self && <span className="ml-2 text-xs font-normal text-stone-400">{t('users.you')}</span>}
                    </h3>
                    {(u.firstName || u.lastName) && <p className="truncate text-sm text-stone-500">{u.email}</p>}
                    <p className="mt-1 text-xs text-stone-400">
                      {t('users.registered', { date: dateFormat.format(new Date(u.createdAt)) })}
                      {u.lastSignInAt && ` · ${t('users.lastAccess', { date: dateFormat.format(new Date(u.lastSignInAt)) })}`}
                    </p>
                  </div>
                  <div className="col-span-2 row-start-2 flex flex-wrap items-center gap-2 sm:order-2 sm:mt-1.5 sm:gap-3">
                    {blockText(u) && (
                      <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700">{t('users.blocked', { when: blockText(u) })}</span>
                    )}
                    <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">{roleLabel(u.role)}</span>
                  </div>
                  <button
                    type="button"
                    aria-expanded={editing === u.id}
                    aria-label={t('users.editAria', { name: userLabel(u) })}
                    onClick={() => setEditing(editing === u.id ? null : u.id)}
                    className={`${ghostButton} col-start-2 row-start-1 sm:order-3`}
                  >
                    {t('edit')}
                  </button>
                </div>
                <Collapsible open={editing === u.id}>
                  <UserEditor
                    user={u}
                    self={self}
                    onCancel={() => setEditing(null)}
                    onSaved={() => {
                      setEditing(null)
                      showToast(t('users.updated'))
                      reload()
                    }}
                  />
                </Collapsible>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
