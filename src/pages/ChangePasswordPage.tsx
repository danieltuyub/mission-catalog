import { useState, type FormEvent } from 'react'
import { completeFirstPassword, MIN_PASSWORD_LENGTH } from '../services/accountService'
import { signOut } from '../services/authService'

const input =
  'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-brand-sage focus:ring-1 focus:ring-brand-sage'

/**
 * Shown instead of the whole app to an account an admin created with a temporary password.
 * It goes away by itself once the password is set (the session then carries no "must change" mark).
 */
export default function ChangePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (password.length < MIN_PASSWORD_LENGTH) return setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`)
    if (password !== confirm) return setError('Las contraseñas no coinciden')
    setSaving(true)
    setError(null)
    try {
      await completeFirstPassword(password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña')
      setSaving(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-linear-to-b from-stone-50 to-stone-100 px-4 py-10">
      <form
        noValidate
        onSubmit={submit}
        aria-labelledby="first-password-title"
        className="animate-fade-in w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow ring-1 ring-black/5 motion-reduce:animate-none"
      >
        <div>
          <h1 id="first-password-title" className="text-2xl font-semibold tracking-tight text-brand-primary">
            Elige tu contraseña
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Entraste con una contraseña temporal. Elige una propia para continuar.
          </p>
        </div>

        <div className="text-sm text-gray-700">
          <label htmlFor="first-password">Nueva contraseña</label>
          <input
            id="first-password"
            type="password"
            autoFocus
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={input}
          />
        </div>
        <div className="text-sm text-gray-700">
          <label htmlFor="first-password-confirm">Confirmar contraseña</label>
          <input
            id="first-password-confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={input}
          />
        </div>
        <p className="text-xs text-stone-500">Mínimo {MIN_PASSWORD_LENGTH} caracteres.</p>

        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="h-10 w-full rounded-full bg-brand-primary text-sm font-medium text-brand-blush hover:bg-brand-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar contraseña'}
        </button>
        <button
          type="button"
          onClick={() => void signOut().catch(() => {})}
          className="block w-full rounded-full py-1.5 text-center text-sm text-stone-500 hover:bg-brand-blush/70 hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-brand-sage"
        >
          Cerrar sesión
        </button>
      </form>
    </main>
  )
}
