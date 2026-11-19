import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { createUser, ROLES, roleLabel, type Role } from '../../services/adminUsers'
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
  const { t } = useTranslation('admin')
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
    if (password.length < MIN_PASSWORD_LENGTH) return setError(t('newUser.tooShort', { count: MIN_PASSWORD_LENGTH }))
    setSaving(true)
    setError(null)
    try {
      await createUser({ email: email.trim(), firstName: firstName.trim(), lastName: lastName.trim(), role, password })
      setCreated({ email: email.trim(), password })
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('newUser.failed'))
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
      showToast(t('newUser.copied'))
    } catch {
      showToast(t('newUser.copyFailed'))
    }
  }

  if (created) {
    return (
      <section aria-label={t('newUser.created')} className={`${card} space-y-3`}>
        <h3 className="font-semibold text-brand-primary">{t('newUser.created')}</h3>
        <p className="text-sm text-stone-600">
          {t('newUser.handOver')} <strong className="font-medium">{t('newUser.passwordOnce')}</strong>
          {t('newUser.handOverEnd')}
        </p>
        <dl className="space-y-2 text-sm">
          {[
            ['email', t('newUser.email'), created.email, t('newUser.copyEmail')],
            ['password', t('newUser.tempPassword'), created.password, t('newUser.copyPassword')],
          ].map(([key, label, value, copyLabel]) => (
            <div key={key} className="flex flex-wrap items-center gap-2">
              <dt className="w-40 text-stone-500">{label}</dt>
              <dd className="rounded-md bg-stone-100 px-2 py-1 font-mono text-stone-900 select-all">{value}</dd>
              <button type="button" onClick={() => copy(value)} aria-label={copyLabel} className={ghostButton}>
                {t('newUser.copy')}
              </button>
            </div>
          ))}
        </dl>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className={primaryButton}>
            {t('newUser.done')}
          </button>
          <button type="button" onClick={another} className={ghostButton}>
            {t('newUser.another')}
          </button>
        </div>
      </section>
    )
  }

  return (
    <form onSubmit={submit} aria-label={t('newUser.title')} className={`${card} space-y-3`}>
      <h3 className="font-semibold text-brand-primary">{t('newUser.title')}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm text-stone-600 sm:col-span-2">
          {t('newUser.email')}
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
          {t('newUser.firstName')}
          <input value={firstName} maxLength={80} onChange={(e) => setFirstName(e.target.value)} className={`${inputClass} mt-1 w-full`} />
        </label>
        <label className="block text-sm text-stone-600">
          {t('newUser.lastName')}
          <input value={lastName} maxLength={80} onChange={(e) => setLastName(e.target.value)} className={`${inputClass} mt-1 w-full`} />
        </label>
        <label className="block text-sm text-stone-600">
          {t('newUser.role')}
          <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={`${inputClass} mt-1 w-full`}>
            {ROLES.map((r) => (
              <option key={r.id} value={r.id}>
                {roleLabel(r.id)}
              </option>
            ))}
          </select>
        </label>
        <div className="text-sm text-stone-600">
          <label htmlFor="new-user-password">{t('newUser.tempPassword')}</label>
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
              {t('newUser.regenerate')}
            </button>
          </div>
        </div>
      </div>
      <p className="text-xs text-stone-500">
        {t('newUser.note')}
      </p>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className={primaryButton}>
          {saving ? t('newUser.creating') : t('newUser.create')}
        </button>
        <button type="button" onClick={onClose} disabled={saving} className={ghostButton}>
          {t('cancel')}
        </button>
      </div>
    </form>
  )
}
