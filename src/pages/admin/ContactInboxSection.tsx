import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAdminContactId } from '../../hooks/useRoute'
import { listContactMessages, setContactRead, subscribeToContacts, type ContactMessage } from '../../services/contactMessages'
import { showToast } from '../../services/toast'
import { ghostButton } from './styles'
import { Empty, LoadError, Loading } from './ui'

/** Day, month and time in the current language. */
function useWhen() {
  const { i18n } = useTranslation()
  const format = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  return (iso: string) => format.format(new Date(iso))
}

const isEmail = (value: string) => value.includes('@')

/** "Contacto": what visitors sent through the public form. Opening one marks it read; it can be marked unread again. */
export default function ContactInboxSection() {
  const { t } = useTranslation('admin')
  const when = useWhen()
  const activeId = useAdminContactId()
  const [messages, setMessages] = useState<ContactMessage[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    listContactMessages().then(
      (list) => {
        if (cancelled) return
        setMessages(list)
        setError(null)
      },
      (e: unknown) => !cancelled && setError(e instanceof Error ? e.message : t('error')),
    )
    return () => {
      cancelled = true
    }
  }, [version, t])

  // New messages show up without reloading the page.
  useEffect(() => subscribeToContacts(() => setVersion((v) => v + 1)), [])

  const active = messages?.find((m) => m.id === activeId)
  const activeUnread = !!active && !active.readAt

  // Opening a message reads it. Marking it unread again while it is open sticks: this only runs when the open one changes.
  const openedId = active?.id
  useEffect(() => {
    if (!openedId || !activeUnread) return
    const readAt = new Date().toISOString()
    setMessages((list) => list?.map((m) => (m.id === openedId ? { ...m, readAt } : m)) ?? null)
    setContactRead(openedId, true).catch(() => {
      showToast(t('contactInbox.updateFailed'))
      setMessages((list) => list?.map((m) => (m.id === openedId ? { ...m, readAt: null } : m)) ?? null)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openedId])

  async function markUnread(id: string) {
    setMessages((list) => list?.map((m) => (m.id === id ? { ...m, readAt: null } : m)) ?? null)
    try {
      await setContactRead(id, false)
    } catch {
      showToast(t('contactInbox.updateFailed'))
      setVersion((v) => v + 1)
    }
  }

  if (error && !messages) return <LoadError message={error} onRetry={() => setVersion((v) => v + 1)} />
  if (!messages) return <Loading />
  if (messages.length === 0) return <Empty>{t('contactInbox.none')}</Empty>

  return (
    <div className="grid gap-4 md:grid-cols-[20rem_minmax(0,1fr)]">
      <nav
        aria-label={t('contactInbox.list')}
        className={`${activeId ? 'hidden md:block' : ''} max-h-[34rem] overflow-y-auto rounded-2xl bg-white shadow ring-1 ring-black/5`}
      >
        <ul className="divide-y divide-stone-100">
          {messages.map((m) => (
            <li key={m.id}>
              <a
                href={`#/admin/contacto/${m.id}`}
                aria-current={m.id === activeId ? 'page' : undefined}
                className={`block px-4 py-3 outline-none focus-visible:bg-brand-blush ${m.id === activeId ? 'bg-brand-blush/70' : 'hover:bg-stone-50'}`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className={`flex min-w-0 items-center gap-2 text-sm text-brand-primary ${m.readAt ? 'font-medium' : 'font-semibold'}`}>
                    {!m.readAt && <span role="img" aria-label={t('contactInbox.unread')} className="size-2 shrink-0 rounded-full bg-rose-500" />}
                    <span className="truncate">{m.name}</span>
                  </span>
                  <span className="shrink-0 text-xs text-stone-400">{when(m.createdAt)}</span>
                </div>
                <p className={`truncate text-sm ${m.readAt ? 'text-stone-500' : 'text-stone-700'}`}>{m.body}</p>
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <section
        aria-label={t('contactInbox.message')}
        className={`${activeId ? 'flex' : 'hidden md:flex'} min-h-[20rem] flex-col overflow-hidden rounded-2xl bg-white shadow ring-1 ring-black/5`}
      >
        {active ? (
          <>
            <header className="flex items-center gap-3 border-b border-stone-100 px-4 py-3">
              <a
                href="#/admin/contacto"
                aria-label={t('contactInbox.back')}
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-brand-primary ring-1 ring-black/5 hover:bg-brand-blush focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage md:hidden"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </a>
              <div className="min-w-0 flex-1">
                <h2 title={active.name} className="truncate font-semibold text-brand-primary">
                  {t('contactInbox.from', { name: active.name })}
                </h2>
                <p className="truncate text-xs text-stone-500">{t('contactInbox.sent', { when: when(active.createdAt) })}</p>
              </div>
              <button type="button" onClick={() => markUnread(active.id)} disabled={!active.readAt} className={ghostButton}>
                {t('contactInbox.markUnread')}
              </button>
            </header>
            <div className="flex-1 space-y-4 bg-stone-50 px-4 py-4">
              <p className="text-sm text-stone-600">
                {t('contactInbox.replyTo')}{' '}
                {isEmail(active.contact) ? (
                  <a href={`mailto:${active.contact}`} className="font-medium text-brand-primary underline underline-offset-2">
                    {active.contact}
                  </a>
                ) : (
                  <a href={`tel:${active.contact.replace(/[^\d+]/g, '')}`} className="font-medium text-brand-primary underline underline-offset-2">
                    {active.contact}
                  </a>
                )}
              </p>
              <p className="whitespace-pre-wrap break-words rounded-2xl bg-white px-4 py-3 text-sm text-stone-800 ring-1 ring-black/5">{active.body}</p>
            </div>
            <p className="border-t border-stone-100 px-4 py-2 text-center text-xs text-stone-500">{t('contactInbox.readOnly')}</p>
          </>
        ) : (
          <p className="m-auto px-6 text-center text-stone-500">{activeId ? t('contactInbox.notFound') : t('contactInbox.choose')}</p>
        )}
      </section>
    </div>
  )
}
