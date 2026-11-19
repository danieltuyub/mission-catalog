import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { completeFirstPassword, MIN_PASSWORD_LENGTH } from '../services/accountService'
import { signOut } from '../services/authService'

const input =
  'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-brand-sage focus:ring-1 focus:ring-brand-sage'

/**
 * Shown instead of the whole app to an account an admin created with a temporary password.
 * It goes away by itself once the password is set (the session then carries no "must change" mark).
 */
export default function ChangePasswordPage() {
  const { t } = useTranslation('auth')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (password.length < MIN_PASSWORD_LENGTH) return setError(t('first.tooShort', { count: MIN_PASSWORD_LENGTH }))
    if (password !== confirm) return setError(t('first.mismatch'))
    setSaving(true)
    setError(null)
    try {
      await completeFirstPassword(password)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('first.failed'))
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
            {t('first.title')}
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {t('first.intro')}
          </p>
        </div>

        <div className="text-sm text-gray-700">
          <label htmlFor="first-password">{t('first.newPassword')}</label>
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
          <label htmlFor="first-password-confirm">{t('first.confirm')}</label>
          <input
            id="first-password-confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={input}
          />
        </div>
        <p className="text-xs text-stone-500">{t('first.min', { count: MIN_PASSWORD_LENGTH })}</p>

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
          {saving ? t('first.saving') : t('first.save')}
        </button>
        <button
          type="button"
          onClick={() => void signOut().catch(() => {})}
          className="block w-full rounded-full py-1.5 text-center text-sm text-stone-500 hover:bg-brand-blush/70 hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-brand-sage"
        >
          {t('first.signOut')}
        </button>
      </form>
    </main>
  )
}
