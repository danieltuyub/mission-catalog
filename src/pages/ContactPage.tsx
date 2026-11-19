import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../hooks/useAuth'
import {
  MAX_CONTACT_BODY,
  MAX_CONTACT_NAME,
  MAX_CONTACT_VALUE,
  isValidContact,
  sendContactMessage,
} from '../services/contactMessages'
import { can } from '../services/permissions'

const input =
  'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-brand-sage focus:ring-1 focus:ring-brand-sage'

/** The public contact form. Admins read the messages instead: they are sent to their inbox. */
export default function ContactPage() {
  const { t } = useTranslation('contact')
  const auth = useAuth()
  const isAdmin = can(auth, 'users.manage')
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [body, setBody] = useState('')
  // A field no person sees: a bot that fills every input fills this one too.
  const [website, setWebsite] = useState('')
  const [touched, setTouched] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isAdmin) window.location.replace('#/admin/contacto')
  }, [isAdmin])

  if (isAdmin) return null

  const contactInvalid = touched && contact.trim() !== '' && !isValidContact(contact)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (sending) return
    if (!isValidContact(contact)) return setTouched(true)
    setError(null)
    // Looks sent, nothing is: the bot learns nothing.
    if (website) return setSent(true)
    setSending(true)
    try {
      await sendContactMessage({ name, contact, body })
      setSent(true)
      setName('')
      setContact('')
      setBody('')
      setTouched(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('send'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mx-auto w-[94%] pb-10 md:w-4/5">
      <PageHeader title={t('title')} />
      <div className="mx-auto max-w-xl">
        {sent ? (
          <div role="status" className="rounded-2xl bg-white p-6 text-center shadow ring-1 ring-black/5">
            <h2 className="text-lg font-semibold text-brand-primary">{t('sentTitle')}</h2>
            <p className="mt-2 text-sm text-gray-600">{t('sentText')}</p>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="mt-5 inline-flex h-10 items-center rounded-full bg-white px-5 text-sm text-brand-primary ring-1 ring-black/10 hover:bg-brand-blush focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage"
            >
              {t('another')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} aria-label={t('title')} className="space-y-4 rounded-2xl bg-white p-6 shadow ring-1 ring-black/5">
            <p className="text-sm text-gray-600">{t('intro')}</p>

            <label className="block text-sm text-gray-700">
              {t('name')}
              <input
                required
                maxLength={MAX_CONTACT_NAME}
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={input}
              />
            </label>

            <label className="block text-sm text-gray-700">
              {t('contact')}
              <input
                required
                maxLength={MAX_CONTACT_VALUE}
                autoComplete="email"
                inputMode="email"
                aria-invalid={contactInvalid}
                aria-describedby="contact-hint"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                onBlur={() => setTouched(true)}
                className={`${input} ${contactInvalid ? 'border-red-500' : ''}`}
              />
              <span id="contact-hint" className={`mt-1 block text-xs ${contactInvalid ? 'text-red-700' : 'text-gray-500'}`}>
                {contactInvalid ? t('invalidContact') : t('contactHint')}
              </span>
            </label>

            <label className="block text-sm text-gray-700">
              {t('message')}
              <textarea
                required
                rows={6}
                maxLength={MAX_CONTACT_BODY}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className={`${input} resize-y`}
              />
              <span className="mt-1 block text-right text-xs text-gray-400">{t('count', { count: body.length, max: MAX_CONTACT_BODY })}</span>
            </label>

            {/* Honeypot: out of sight, out of the tab order and ignored by password managers. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label>
                Website
                <input tabIndex={-1} autoComplete="off" data-1p-ignore value={website} onChange={(e) => setWebsite(e.target.value)} />
              </label>
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={sending || !name.trim() || !body.trim()}
              className="h-10 w-full rounded-full bg-brand-primary text-sm font-medium text-brand-blush hover:bg-brand-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage disabled:opacity-50"
            >
              {sending ? t('sending') : t('send')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
