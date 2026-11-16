import { useState, type FormEvent, type ReactNode } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useProfile } from '../../hooks/useProfile'
import { changePassword, MIN_PASSWORD_LENGTH, updateProfile, type Profile } from '../../services/accountService'
import { setProfileNames } from '../../services/authService'

const control =
  'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-brand-sage focus:ring-1 focus:ring-brand-sage aria-invalid:border-red-500'

const submitButton =
  'h-10 rounded-full bg-brand-primary px-6 text-sm font-medium text-brand-blush hover:bg-brand-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage disabled:opacity-50'

function Section({ id, title, className = '', children }: { id: string; title: string; className?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className={className}>
      <h2 id={id} className="mb-4 text-xs font-semibold uppercase tracking-wide text-stone-500">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Feedback({ error, done }: { error: string | null; done: string | null }) {
  if (error)
    return (
      <p role="alert" className="text-sm text-red-700">
        {error}
      </p>
    )
  if (done)
    return (
      <p role="status" className="text-sm text-green-700">
        {done}
      </p>
    )
  return null
}

function ProfileForm({ userId, email, initial }: { userId: string; email: string; initial: Profile }) {
  const [firstName, setFirstName] = useState(initial.first_name)
  const [lastName, setLastName] = useState(initial.last_name)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setDone(null)
    if (!firstName.trim()) return setError('El nombre es obligatorio')
    setSaving(true)
    setError(null)
    try {
      const saved = { first_name: firstName.trim(), last_name: lastName.trim() }
      await updateProfile(userId, saved)
      setProfileNames(saved.first_name, saved.last_name)
      setDone('Cambios guardados')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los cambios')
    }
    setSaving(false)
  }

  return (
    <form noValidate onSubmit={submit} aria-label="Datos personales" className="space-y-4">
      <div className="text-sm text-gray-700">
        <p>Correo</p>
        <p className="mt-1 truncate text-brand-primary" title={email}>
          {email}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="text-sm text-gray-700">
          <label htmlFor="account-first-name">Nombre</label>
          <input
            id="account-first-name"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={control}
            aria-invalid={error === 'El nombre es obligatorio' || undefined}
          />
        </div>
        <div className="text-sm text-gray-700">
          <label htmlFor="account-last-name">Apellido</label>
          <input
            id="account-last-name"
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={control}
          />
        </div>
      </div>
      <Feedback error={error} done={done} />
      <div className="flex justify-end">
        <button type="submit" disabled={saving} className={submitButton}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}

function PasswordForm() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setDone(null)
    if (password.length < MIN_PASSWORD_LENGTH) return setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`)
    if (password !== confirm) return setError('Las contraseñas no coinciden')
    setSaving(true)
    setError(null)
    try {
      await changePassword(password)
      setPassword('')
      setConfirm('')
      setDone('Contraseña actualizada')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña')
    }
    setSaving(false)
  }

  return (
    <form noValidate onSubmit={submit} aria-label="Cambiar contraseña" className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="text-sm text-gray-700">
          <label htmlFor="account-password">Nueva contraseña</label>
          <input
            id="account-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={control}
          />
        </div>
        <div className="text-sm text-gray-700">
          <label htmlFor="account-confirm">Confirmar contraseña</label>
          <input
            id="account-confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={control}
          />
        </div>
      </div>
      <p className="text-xs text-stone-500">Mínimo {MIN_PASSWORD_LENGTH} caracteres.</p>
      <Feedback error={error} done={done} />
      <div className="flex justify-end">
        <button type="submit" disabled={saving} className={submitButton}>
          {saving ? 'Guardando…' : 'Cambiar contraseña'}
        </button>
      </div>
    </form>
  )
}

/** "Mi cuenta": the personal data and the password, in a single panel with a form each. */
export default function ProfileSection() {
  const { userId, email } = useAuth()
  if (!userId) return null
  return <Profile userId={userId} email={email ?? ''} />
}

function Profile({ userId, email }: { userId: string; email: string }) {
  const { profile, loading, error } = useProfile(userId)

  return (
    <div className="max-w-3xl space-y-6 rounded-2xl bg-white p-6 shadow ring-1 ring-black/5">
      <Section id="account-profile" title="Datos personales">
        {loading && <p className="py-6 text-center text-stone-500">Cargando…</p>}
        {error && (
          <p role="alert" className="text-sm text-red-700">
            No se pudo cargar tu perfil: {error}
          </p>
        )}
        {!loading && !error && !profile && <p className="text-sm text-stone-500">No se encontró tu perfil.</p>}
        {profile && <ProfileForm userId={userId} email={email} initial={profile} />}
      </Section>
      <Section id="account-password-section" title="Contraseña" className="border-t border-stone-200 pt-6">
        <PasswordForm />
      </Section>
    </div>
  )
}
