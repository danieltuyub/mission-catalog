import { useEffect, useState } from 'react'
import { useAdminConversationId } from '../../hooks/useRoute'
import { useUsers } from '../../hooks/useUsers'
import { listAllConversations, listThread, type ModerationConversation } from '../../services/messages'
import type { Message } from '../../types'
import { Empty, LoadError, Loading } from './ui'

const whenFormat = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

const title = (c: ModerationConversation) => c.projectName ?? c.pinTitle ?? 'Conversación directa'

function Thread({ conversation, userA, userB }: { conversation: ModerationConversation; userA: string; userB: string }) {
  const [messages, setMessages] = useState<Message[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listThread(conversation.id).then(
      (loaded) => !cancelled && setMessages(loaded),
      (e: unknown) => !cancelled && setError(e instanceof Error ? e.message : 'Error'),
    )
    return () => {
      cancelled = true
    }
  }, [conversation.id])

  return (
    <>
      <header className="flex items-center gap-3 border-b border-stone-100 px-4 py-3">
        <a
          href="#/admin/mensajes"
          aria-label="Volver a las conversaciones"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-brand-primary ring-1 ring-black/5 hover:bg-brand-blush focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage md:hidden"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </a>
        <div className="min-w-0">
          <h2 title={title(conversation)} className="truncate font-semibold text-brand-primary">
            {title(conversation)}
          </h2>
          <p className="truncate text-xs text-stone-500">
            {userA} ↔ {userB}
          </p>
        </div>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto bg-stone-50 px-4 py-4">
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        {!messages && !error && <p className="py-6 text-center text-stone-500">Cargando…</p>}
        {messages?.map((m) => {
          const first = m.sender_id === conversation.userA
          return (
            <div key={m.id} className={`flex ${first ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${first ? 'bg-white text-stone-800 ring-1 ring-black/5' : 'bg-brand-primary text-brand-blush'}`}>
                <p className={`mb-0.5 text-[11px] font-medium ${first ? 'text-stone-500' : 'text-brand-blush/70'}`}>{m.sender_name || (first ? userA : userB)}</p>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`mt-1 text-right text-[11px] ${first ? 'text-stone-400' : 'text-brand-blush/60'}`}>{whenFormat.format(new Date(m.created_at))}</p>
              </div>
            </div>
          )
        })}
      </div>
      <p className="border-t border-stone-100 px-4 py-2 text-center text-xs text-stone-500">Solo lectura: moderación</p>
    </>
  )
}

/** "Mensajes": every conversation, read only. Opening one does not mark anything as read. */
export default function ModerationSection() {
  const activeId = useAdminConversationId()
  const { nameOf } = useUsers()
  const [conversations, setConversations] = useState<ModerationConversation[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    listAllConversations().then(
      (list) => {
        if (cancelled) return
        setConversations(list)
        setError(null)
      },
      (e: unknown) => !cancelled && setError(e instanceof Error ? e.message : 'Error'),
    )
    return () => {
      cancelled = true
    }
  }, [version])

  if (error && !conversations) return <LoadError message={error} onRetry={() => setVersion((v) => v + 1)} />
  if (!conversations) return <Loading />
  if (conversations.length === 0) return <Empty>Aún no hay conversaciones.</Empty>

  const active = conversations.find((c) => c.id === activeId)

  return (
    <div className="grid gap-4 md:grid-cols-[20rem_minmax(0,1fr)]">
      <nav
        aria-label="Conversaciones"
        className={`${activeId ? 'hidden md:block' : ''} max-h-[34rem] overflow-y-auto rounded-2xl bg-white shadow ring-1 ring-black/5`}
      >
        <ul className="divide-y divide-stone-100">
          {conversations.map((c) => (
            <li key={c.id}>
              <a
                href={`#/admin/mensajes/${c.id}`}
                aria-current={c.id === activeId ? 'page' : undefined}
                className={`block px-4 py-3 outline-none focus-visible:bg-brand-blush ${c.id === activeId ? 'bg-brand-blush/70' : 'hover:bg-stone-50'}`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span title={title(c)} className="truncate text-sm font-medium text-brand-primary">
                    {title(c)}
                  </span>
                  <span className="shrink-0 text-xs text-stone-400">{whenFormat.format(new Date(c.lastMessageAt))}</span>
                </div>
                <p className="truncate text-xs text-stone-500">
                  {nameOf(c.userA)} ↔ {nameOf(c.userB)}
                </p>
                <p className="truncate text-sm text-stone-500">{c.lastBody}</p>
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <section
        aria-label="Conversación"
        className={`${activeId ? 'flex' : 'hidden md:flex'} h-[34rem] flex-col overflow-hidden rounded-2xl bg-white shadow ring-1 ring-black/5`}
      >
        {active ? (
          <Thread key={active.id} conversation={active} userA={nameOf(active.userA)} userB={nameOf(active.userB)} />
        ) : (
          <p className="m-auto px-6 text-center text-stone-500">
            {activeId ? 'No se encontró esta conversación.' : 'Elige una conversación para leerla.'}
          </p>
        )}
      </section>
    </div>
  )
}
