import { useRef, useState, type FormEvent } from 'react'
import Collapsible from '../../components/Collapsible'
import FormSelect from '../../components/FormSelect'
import Pagination from '../../components/Pagination'
import { useAuth } from '../../hooks/useAuth'
import { useUsers } from '../../hooks/useUsers'
import { ROLES, roleLabel, setUserRole, updateUserName, userLabel, type AdminUser, type Role } from '../../services/adminUsers'
import { showToast } from '../../services/toast'
import NewUserForm from './NewUserForm'
import { Empty, LoadError, Loading, SearchBox } from './ui'
import { card, dateFormat, ghostButton, inputClass, matches, primaryButton } from './styles'

const PAGE_SIZE = 10

function UserEditor({ user, self, onSaved, onCancel }: { user: AdminUser; self: boolean; onSaved: () => void; onCancel: () => void }) {
  const [first, setFirst] = useState(user.firstName)
  const [last, setLast] = useState(user.lastName)
  const [role, setRole] = useState<Role | ''>(user.role ?? '')
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
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} aria-label={`Editar a ${user.email}`} className="space-y-3 border-t border-stone-100 pt-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm text-stone-600">
          Nombre
          <input value={first} maxLength={80} onChange={(e) => setFirst(e.target.value)} className={`${inputClass} mt-1 w-full`} />
        </label>
        <label className="block text-sm text-stone-600">
          Apellido
          <input value={last} maxLength={80} onChange={(e) => setLast(e.target.value)} className={`${inputClass} mt-1 w-full`} />
        </label>
        <label className="block text-sm text-stone-600">
          Rol
          <FormSelect
            value={role}
            disabled={self}
            title={self ? 'No puedes cambiar tu propio rol' : undefined}
            onChange={(e) => setRole(e.target.value as Role)}
            className={`${inputClass} mt-1 w-full`}
          >
            {!user.role && <option value="">Sin rol</option>}
            {ROLES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
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
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        <button type="button" onClick={onCancel} className={ghostButton}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

/** "Usuarios": create accounts, edit anyone's name or role. Disabling accounts comes later. */
export default function UsersSection() {
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
    <section aria-label="Usuarios" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <SearchBox
          label="Buscar usuario"
          value={query}
          onChange={(v) => {
            setQuery(v)
            setPage(1)
          }}
        />
        <div className="flex items-center gap-3">
          {totalPages > 1 && <Pagination page={current} totalPages={totalPages} onChange={setPage} />}
          <button ref={newUserButton} type="button" onClick={() => setCreating(true)} disabled={creating} className={primaryButton}>
            Nuevo usuario
          </button>
        </div>
      </div>
      <Collapsible open={creating}>
        <NewUserForm onCreated={reload} onClose={closeNewUser} />
      </Collapsible>
      {shown.length === 0 ? (
        <Empty>Ningún usuario coincide con la búsqueda.</Empty>
      ) : (
        <ul className="space-y-3">
          {shown.map((u) => {
            const self = u.id === userId
            return (
              <li key={u.id} className={`${card} flex flex-col gap-4`}>
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
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">{roleLabel(u.role)}</span>
                    <button
                      type="button"
                      aria-expanded={editing === u.id}
                      aria-label={`Editar a ${userLabel(u)}`}
                      onClick={() => setEditing(editing === u.id ? null : u.id)}
                      className={ghostButton}
                    >
                      Editar
                    </button>
                  </div>
                </div>
                <Collapsible open={editing === u.id}>
                  <UserEditor
                    user={u}
                    self={self}
                    onCancel={() => setEditing(null)}
                    onSaved={() => {
                      setEditing(null)
                      showToast('Usuario actualizado')
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
