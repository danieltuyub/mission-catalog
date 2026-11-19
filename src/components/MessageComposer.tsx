import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { MAX_MESSAGE_LENGTH } from '../services/messages'

interface Props {
  /** What the message is about, shown under the title. */
  projectName: string
  /** Rejects with a message ready to show. */
  onSend: (body: string) => Promise<void>
  onCancel: () => void
}

export default function MessageComposer({ projectName, onSend, onCancel }: Props) {
  const { t } = useTranslation('map')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const text = body.trim()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !sending && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel, sending])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!text) return
    setSending(true)
    setError(null)
    try {
      await onSend(text)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('composer.failed'))
      setSending(false)
    }
  }

  // In `body`: inside a transformed or clipped ancestor (the pin card) a fixed dialog would be trapped there.
  return createPortal(
    <div
      className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !sending && onCancel()}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="message-title"
        onSubmit={submit}
        className="w-full max-w-md space-y-3 rounded-2xl bg-white p-5 shadow-xl"
      >
        <div>
          <h2 id="message-title" className="text-lg font-semibold text-brand-primary">
            {t('message.send', { ns: 'common' })}
          </h2>
          <p title={projectName} className="truncate text-sm text-stone-500">
            {t('composer.about', { name: projectName })}
          </p>
        </div>

        <label className="block text-sm text-gray-700">
          {t('composer.message')}
          <textarea
            autoFocus
            required
            rows={5}
            maxLength={MAX_MESSAGE_LENGTH}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="mt-1 w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-brand-sage focus:ring-1 focus:ring-brand-sage"
          />
        </label>
        <p className="text-right text-xs text-stone-400">
          {body.length}/{MAX_MESSAGE_LENGTH}
        </p>

        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={sending}
            className="h-10 rounded-full px-4 text-sm text-gray-600 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-brand-sage disabled:opacity-50"
          >
            {t('actions.cancel', { ns: 'common' })}
          </button>
          <button
            type="submit"
            disabled={sending || !text}
            className="h-10 rounded-full bg-brand-primary px-5 text-sm font-medium text-brand-blush hover:bg-brand-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage disabled:opacity-50"
          >
            {sending ? t('actions.sending', { ns: 'common' }) : t('actions.send', { ns: 'common' })}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}
