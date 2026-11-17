import { useState, type FormEvent } from 'react'
import { createUser, ROLES, type Role } from '../../services/adminUsers'
import { MIN_PASSWORD_LENGTH } from '../../services/accountService'
import { generatePassword } from '../../services/passwords'
import { showToast } from '../../services/toast'
import { card, ghostButton, inputClass, primaryButton } from './styles'

interface Props {
  /** An account was created: the list should be read again. */
  onCreated: () => void
  onClose: () => void
}

const MAX_PASSWORD_LENGTH = 72

/** "Nuevo usuario": an account with a temporary password the admin hands over (until emails can be sent). */
export default function NewUserForm({ onCreated, onClose }: Props) {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState<Role>('subscriber')
  const [password, setPassword] = useState(() => generatePassword())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // After creating: what to hand over. The password is not stored anywhere else.
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (saving) return
    if (password.length < MIN_PASSWORD_LENGTH) return setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`)
    setSaving(true)
    setError(null)
    try {
      await createUser({ email: email.trim(), firstName: firstName.trim(), lastName: lastName.trim(), role, password })
      setCreated({ email: email.trim(), password })
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el usuario')
    }
    setSaving(false)
  }

  function another() {
    setCreated(null)
    setEmail('')
    setFirstName('')
    setLastName('')
    setRole('subscriber')
    setPassword(generatePassword())
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      showToast('Copiado')
    } catch {
      showToast('No se pudo copiar: selecciónalo y cópialo a mano')
    }
  }

  if (created) {
    return (
      <section aria-label="Usuario creado" className={`${card} space-y-3`}>
        <h3 className="font-semibold text-brand-primary">Usuario creado</h3>
        <p className="text-sm text-stone-600">
          Entrégale estos datos. <strong className="font-medium">La contraseña no se vuelve a mostrar</strong>; al entrar por primera vez le pedirá elegir una propia.
        </p>
        <dl className="space-y-2 text-sm">
          {[
            ['Correo', created.email],
            ['Contraseña temporal', created.password],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-wrap items-center gap-2">
              <dt className="w-40 text-stone-500">{label}</dt>
              <dd className="rounded-md bg-stone-100 px-2 py-1 font-mono text-stone-900 select-all">{value}</dd>
              <button type="button" onClick={() => copy(value)} aria-label={`Copiar ${label.toLowerCase()}`} className={ghostButton}>
                Copiar
              </button>
            </div>
          ))}
        </dl>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className={primaryButton}>
            Listo
          </button>
          <button type="button" onClick={another} className={ghostButton}>
            Crear otro
          </button>
        </div>
      </section>
    )
  }

  return (
    <form onSubmit={submit} aria-label="Nuevo usuario" className={`${card} space-y-3`}>
      <h3 className="font-semibold text-brand-primary">Nuevo usuario</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm text-stone-600 sm:col-span-2">
          Correo
          <input
            type="email"
            required
            autoFocus
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`${inputClass} mt-1 w-full`}
          />
        </label>
        <label className="block text-sm text-stone-600">
          Nombre
          <input value={firstName} maxLength={80} onChange={(e) => setFirstName(e.target.value)} className={`${inputClass} mt-1 w-full`} />
        </label>
        <label className="block text-sm text-stone-600">
          Apellido
          <input value={lastName} maxLength={80} onChange={(e) => setLastName(e.target.value)} className={`${inputClass} mt-1 w-full`} />
        </label>
        <label className="block text-sm text-stone-600">
          Rol
          <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={`${inputClass} mt-1 w-full`}>
            {ROLES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <div className="text-sm text-stone-600">
          <label htmlFor="new-user-password">Contraseña temporal</label>
          <div className="mt-1 flex gap-2">
            <input
              id="new-user-password"
              type="text"
              required
              autoComplete="off"
              maxLength={MAX_PASSWORD_LENGTH}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} min-w-0 flex-1 font-mono`}
            />
            <button type="button" onClick={() => setPassword(generatePassword())} className={ghostButton}>
              Regenerar
            </button>
          </div>
        </div>
      </div>
      <p className="text-xs text-stone-500">
        La cuenta queda confirmada y, al entrar por primera vez, el usuario deberá elegir su propia contraseña.
      </p>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className={primaryButton}>
          {saving ? 'Creando…' : 'Crear usuario'}
        </button>
        <button type="button" onClick={onClose} disabled={saving} className={ghostButton}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
