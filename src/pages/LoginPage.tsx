import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { readNext } from '../services/authRedirect'
import { signIn } from '../services/authService'

const input =
  'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-brand-sage focus:ring-1 focus:ring-brand-sage'

export default function LoginPage() {
  const { t } = useTranslation('auth')
  const { email: sessionEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Focusing the field on a touch device opens the keyboard over the screen right away.
  const [autoFocus] = useState(() => window.matchMedia?.('(hover: hover)').matches ?? true)

  // Signed in (now or already): leave the login page.
  useEffect(() => {
    if (sessionEmail) window.location.replace(`#${readNext()}`)
  }, [sessionEmail])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await signIn(email.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('signInFailed'))
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-linear-to-b from-stone-50 to-stone-100 px-4 py-10">
      <div className="animate-fade-in flex w-full flex-col items-center motion-reduce:animate-none">
        <a href="#/mapa" aria-label="Mission Catalog" className="mb-6 flex items-center gap-3 text-brand-primary">
          <span className="flex size-12 items-center justify-center rounded-full bg-brand-primary">
            <svg viewBox="0 0 24 24" className="size-6 fill-brand-blush" aria-hidden="true">
              <path d="M12 2C8.1 2 5 5 5 8.800 5 14 12 22 12 22s7-8 7-13.200C19 5 15.900 2 12 2zm0 9.500a2.700 2.700 0 1 1 0-5.400 2.700 2.700 0 0 1 0 5.400z" />
            </svg>
          </span>
          <span className="font-semibold">Mission Catalog</span>
        </a>
        <form
          onSubmit={handleSubmit}
          aria-labelledby="login-title"
          className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow ring-1 ring-black/5"
        >
          <h1 id="login-title" className="text-2xl font-semibold tracking-tight text-brand-primary">
            {t('signIn')}
          </h1>

          <label className="block text-sm text-gray-700">
            {t('email')}
            <input
              type="email"
              required
              autoFocus={autoFocus}
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={input}
            />
          </label>

          <div className="text-sm text-gray-700">
            <label htmlFor="login-password">{t('password')}</label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${input} pr-11`}
              />
              <button
                type="button"
                aria-label={showPassword ? t('hide') : t('show')}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-1.5 top-1/2 mt-0.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-gray-500 hover:bg-brand-blush/60 hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-brand-sage"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {showPassword ? (
                    <path d="M17.9 17.9A10.7 10.7 0 0112 20C5 20 1 12 1 12a18.500 18.500 0 014.200-5.200M9.900 4.200A9.100 9.100 0 0112 4c7 0 11 8 11 8a18.500 18.500 0 01-2.200 3.200M1 1l22 22M14.100 14.100a3 3 0 01-4.200-4.200" />
                  ) : (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="h-10 w-full rounded-full bg-brand-primary text-sm font-medium text-brand-blush hover:bg-brand-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage disabled:opacity-50"
          >
            {submitting ? t('signingIn') : t('signIn')}
          </button>

        </form>
        <a
          href="#/mapa"
          className="mt-5 rounded-full px-4 py-1.5 text-sm text-stone-500 hover:bg-brand-blush/70 hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-brand-sage"
        >
          {t('backToMap')}
        </a>
      </div>
    </main>
  )
}
