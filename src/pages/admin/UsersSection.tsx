import { useState, type FormEvent } from 'react'
import Pagination from '../../components/Pagination'
import { useAuth } from '../../hooks/useAuth'
import { useUsers } from '../../hooks/useUsers'
import { ROLES, setUserRole, updateUserName, userLabel, type AdminUser, type Role } from '../../services/adminUsers'
import { showToast } from '../../services/toast'
import { Empty, LoadError, Loading, SearchBox } from './ui'
import { card, dateFormat, ghostButton, inputClass, matches, primaryButton } from './styles'

const PAGE_SIZE = 10

function NameEditor({ user, onSaved, onCancel }: { user: AdminUser; onSaved: () => void; onCancel: () => void }) {
  const [first, setFirst] = useState(user.firstName)
  const [last, setLast] = useState(user.lastName)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      await updateUserName(user.id, first, last)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} aria-label={`Editar nombre de ${user.email}`} className="mt-2 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm text-stone-600">
          Nombre
          <input value={first} maxLength={80} onChange={(e) => setFirst(e.target.value)} className={`${inputClass} mt-1 w-full`} />
        </label>
        <label className="block text-sm text-stone-600">
          Apellido
          <input value={last} maxLength={80} onChange={(e) => setLast(e.target.value)} className={`${inputClass} mt-1 w-full`} />
        </label>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className={primaryButton}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        <button type="button" onClick={onCancel} className={ghostButton}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

/** "Usuarios": change anyone's role or name. Disabling accounts comes later. */
export default function UsersSection() {
  const { userId } = useAuth()
  const { users, loading, error, reload } = useUsers()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  async function changeRole(user: AdminUser, role: Role) {
    setBusy(user.id)
    try {
      await setUserRole(user.id, role)
      showToast('Rol actualizado')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'No se pudo cambiar el rol')
    }
    reload()
    setBusy(null)
  }

  if (error && users.length === 0) return <LoadError message={error} onRetry={reload} />
  if (loading) return <Loading />

  const filtered = query.trim() ? users.filter((u) => matches(`${userLabel(u)} ${u.email}`, query)) : users
  const totalPages = Math.max(Math.ceil(filtered.length / PAGE_SIZE), 1)
  const current = Math.min(page, totalPages)
  const shown = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  return (
    <section aria-label="Usuarios" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <SearchBox
          label="Buscar usuario"
          value={query}
          onChange={(v) => {
            setQuery(v)
            setPage(1)
          }}
        />
        {totalPages > 1 && <Pagination page={current} totalPages={totalPages} onChange={setPage} />}
      </div>
      {shown.length === 0 ? (
        <Empty>Ningún usuario coincide con la búsqueda.</Empty>
      ) : (
        <ul className="space-y-3">
          {shown.map((u) => {
            const self = u.id === userId
            return (
              <li key={u.id} className={card}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-brand-primary">
                      {userLabel(u)}
                      {self && <span className="ml-2 text-xs font-normal text-stone-400">(tú)</span>}
                    </h3>
                    {(u.firstName || u.lastName) && <p className="truncate text-sm text-stone-500">{u.email}</p>}
                    <p className="mt-1 text-xs text-stone-400">
                      Registrado el {dateFormat.format(new Date(u.createdAt))}
                      {u.lastSignInAt && ` · Último acceso ${dateFormat.format(new Date(u.lastSignInAt))}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      aria-label={`Rol de ${userLabel(u)}`}
                      value={u.role ?? ''}
                      disabled={self || busy !== null}
                      title={self ? 'No puedes cambiar tu propio rol' : undefined}
                      onChange={(e) => changeRole(u, e.target.value as Role)}
                      className={inputClass}
                    >
                      {!u.role && <option value="">Sin rol</option>}
                      {ROLES.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    <button type="button" onClick={() => setEditing(editing === u.id ? null : u.id)} className={ghostButton}>
                      Editar nombre
                    </button>
                  </div>
                </div>
                {editing === u.id && (
                  <NameEditor
                    user={u}
                    onCancel={() => setEditing(null)}
                    onSaved={() => {
                      setEditing(null)
                      showToast('Nombre actualizado')
                      reload()
                    }}
                  />
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
