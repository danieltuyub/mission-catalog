import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { useConversations } from '../../hooks/useConversations'
import { useConversationId } from '../../hooks/useRoute'
import {
  listThread,
  markConversationRead,
  MAX_MESSAGE_LENGTH,
  sendReply,
  type ConversationSummary,
} from '../../services/messages'
import { subscribeToMessages } from '../../services/unreadMessages'
import type { Message } from '../../types'

const isToday = (date: Date) => date.toDateString() === new Date().toDateString()

/** Date formatters for the current language: the time today, the day (or day and time) otherwise. */
function useWhen() {
  const { i18n } = useTranslation()
  const lng = i18n.language
  const time = new Intl.DateTimeFormat(lng, { hour: '2-digit', minute: '2-digit' })
  const day = new Intl.DateTimeFormat(lng, { day: 'numeric', month: 'short' })
  const full = new Intl.DateTimeFormat(lng, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  return {
    short: (iso: string) => (isToday(new Date(iso)) ? time : day).format(new Date(iso)),
    long: (iso: string) => (isToday(new Date(iso)) ? time : full).format(new Date(iso)),
  }
}

function useTitle() {
  const { t } = useTranslation('account')
  return (c: ConversationSummary) => c.projectName ?? c.pinTitle ?? t('messages.direct')
}

function ConversationList({ conversations, activeId }: { conversations: ConversationSummary[]; activeId: string | null }) {
  const { t } = useTranslation('account')
  const when = useWhen()
  const title = useTitle()
  return (
    <ul className="divide-y divide-stone-100">
      {conversations.map((c) => (
        <li key={c.id}>
          <a
            href={`#/cuenta/mensajes/${c.id}`}
            aria-current={c.id === activeId ? 'page' : undefined}
            className={`block px-4 py-3 outline-none focus-visible:bg-brand-blush ${
              c.id === activeId ? 'bg-brand-blush/70' : 'hover:bg-stone-50'
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span title={title(c)} className={`truncate text-sm text-brand-primary ${c.unread > 0 ? 'font-semibold' : 'font-medium'}`}>
                {title(c)}
              </span>
              <span className="shrink-0 text-xs text-stone-400">{when.short(c.lastMessageAt)}</span>
            </div>
            {c.otherName && <p className="truncate text-xs text-stone-500">{c.otherName}</p>}
            <div className="mt-0.5 flex items-center justify-between gap-2">
              <p className={`truncate text-sm ${c.unread > 0 ? 'text-brand-primary' : 'text-stone-500'}`}>
                {c.lastMessage ? `${c.lastMessage.fromMe ? t('messages.you') : ''}${c.lastMessage.body}` : ''}
              </p>
              {c.unread > 0 && (
                <span
                  aria-label={t('unreadBadge', { count: c.unread })}
                  className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-rose-500 px-1.5 text-xs font-semibold leading-none text-white"
                >
                  {c.unread > 9 ? '9+' : c.unread}
                </span>
              )}
            </div>
          </a>
        </li>
      ))}
    </ul>
  )
}

interface ThreadProps {
  conversation: ConversationSummary
  userId: string
  /** The list should refresh: something was sent or read. */
  onChanged: () => void
}

function Thread({ conversation, userId, onChanged }: ThreadProps) {
  const { t } = useTranslation('account')
  const when = useWhen()
  const title = useTitle()
  const [messages, setMessages] = useState<Message[] | null>(null)
  const [version, setVersion] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const id = conversation.id
  const text = body.trim()

  useEffect(() => {
    let cancelled = false
    listThread(id).then(
      (loaded) => {
        if (cancelled) return
        setMessages(loaded)
        setLoadError(null)
        // Opening the conversation is reading it.
        if (loaded.some((m) => m.recipient_id === userId && !m.read_at)) {
          markConversationRead(id, userId).then(onChanged, () => {})
        }
      },
      (e: unknown) => !cancelled && setLoadError(e instanceof Error ? e.message : t('messages.error')),
    )
    return () => {
      cancelled = true
    }
  }, [id, userId, version, onChanged, t])

  // Messages that arrive while it is open.
  useEffect(() => subscribeToMessages(userId, () => setVersion((v) => v + 1)), [userId])

  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const theirName = messages?.find((m) => m.sender_id !== userId)?.sender_name || conversation.otherName

  async function submit(e?: FormEvent) {
    e?.preventDefault()
    if (!text || sending) return
    setSending(true)
    setSendError(null)
    try {
      const sent = await sendReply(conversation, text)
      setMessages((current) => [...(current ?? []), sent])
      setBody('')
      onChanged()
    } catch (err) {
      setSendError(err instanceof Error ? err.message : t('messages.sendFailed'))
    }
    setSending(false)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit()
  }

  return (
    <>
      <header className="flex items-center gap-3 border-b border-stone-100 px-4 py-3">
        <a
          href="#/cuenta/mensajes"
          aria-label={t('messages.back')}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-brand-primary ring-1 ring-black/5 hover:bg-brand-blush focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage md:hidden"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </a>
        <div className="min-w-0">
          <h2 title={title(conversation)} className="truncate font-semibold text-brand-primary">
            {conversation.projectId || conversation.pinId ? (
              <a
                href={conversation.projectId ? `#/proyectos/${conversation.projectId}` : `#/mapa?pin=${conversation.pinId}`}
                className="hover:underline focus-visible:outline-2 focus-visible:outline-brand-sage"
              >
                {title(conversation)}
              </a>
            ) : (
              title(conversation)
            )}
          </h2>
          {theirName && <p className="truncate text-xs text-stone-500">{theirName}</p>}
        </div>
      </header>

      <div ref={scroller} className="flex-1 space-y-2 overflow-y-auto bg-stone-50 px-4 py-4">
        {loadError && (
          <p role="alert" className="text-sm text-red-700">
            {loadError}
          </p>
        )}
        {!messages && !loadError && <p className="py-6 text-center text-stone-500">{t('loading')}</p>}
        {messages?.map((m) => {
          const mine = m.sender_id === userId
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                  mine ? 'bg-brand-primary text-brand-blush' : 'bg-white text-stone-800 ring-1 ring-black/5'
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`mt-1 text-right text-[11px] ${mine ? 'text-brand-blush/60' : 'text-stone-400'}`}>{when.long(m.created_at)}</p>
              </div>
            </div>
          )
        })}
      </div>

      <form onSubmit={submit} aria-label={t('messages.reply')} className="border-t border-stone-100 p-3">
        {sendError && (
          <p role="alert" className="mb-2 text-sm text-red-700">
            {sendError}
          </p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            aria-label={t('messages.message')}
            rows={2}
            maxLength={MAX_MESSAGE_LENGTH}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t('messages.placeholder')}
            className="min-w-0 flex-1 resize-none rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand-sage focus:ring-1 focus:ring-brand-sage"
          />
          <button
            type="submit"
            disabled={sending || !text}
            className="h-10 shrink-0 rounded-full bg-brand-primary px-5 text-sm font-medium text-brand-blush hover:bg-brand-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage disabled:opacity-50"
          >
            {sending ? t('actions.sending', { ns: 'common' }) : t('actions.send', { ns: 'common' })}
          </button>
        </div>
      </form>
    </>
  )
}

/** "Mensajes": the inbox. The list and the open conversation side by side from md; one at a time below. */
export default function MessagesSection() {
  const { t } = useTranslation('account')
  const { userId } = useAuth()
  const activeId = useConversationId()
  const { conversations, loading, error, reload } = useConversations(userId)
  const active = conversations.find((c) => c.id === activeId)

  if (loading) return <p className="py-10 text-center text-stone-500">{t('loading')}</p>
  if (error && conversations.length === 0)
    return (
      <div role="alert" className="rounded-2xl bg-white p-6 text-sm text-red-700 shadow ring-1 ring-black/5">
        <p>{error}</p>
        <button
          type="button"
          onClick={reload}
          className="mt-3 h-10 rounded-full px-4 text-brand-primary ring-1 ring-black/10 hover:bg-brand-blush focus-visible:outline-2 focus-visible:outline-brand-sage"
        >
          {t('retry')}
        </button>
      </div>
    )
  if (conversations.length === 0)
    return (
      <div className="rounded-2xl bg-white p-6 text-stone-600 shadow ring-1 ring-black/5">
        <p>{t('messages.emptyTitle')}</p>
        <p className="mt-1 text-sm text-stone-500">{t('messages.emptyHint')}</p>
        <a
          href="#/proyectos"
          className="mt-4 inline-flex h-10 items-center rounded-full bg-white px-4 text-sm text-brand-primary ring-1 ring-black/5 hover:bg-brand-blush focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage"
        >
          {t('messages.seeProjects')}
        </a>
      </div>
    )

  return (
    <div className="grid gap-4 md:grid-cols-[20rem_minmax(0,1fr)]">
      <nav
        aria-label={t('messages.list')}
        className={`${activeId ? 'hidden md:block' : ''} max-h-[34rem] overflow-y-auto rounded-2xl bg-white shadow ring-1 ring-black/5`}
      >
        <ConversationList conversations={conversations} activeId={activeId} />
      </nav>
      <section
        aria-label={t('messages.conversation')}
        className={`${activeId ? 'flex' : 'hidden md:flex'} h-[34rem] flex-col overflow-hidden rounded-2xl bg-white shadow ring-1 ring-black/5`}
      >
        {active && userId ? (
          <Thread key={active.id} conversation={active} userId={userId} onChanged={reload} />
        ) : (
          <p className="m-auto px-6 text-center text-stone-500">
            {activeId ? t('messages.notFound') : t('messages.choose')}
          </p>
        )}
      </section>
    </div>
  )
}
