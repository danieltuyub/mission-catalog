import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { loginUrl } from '../services/authRedirect'
import { can } from '../services/permissions'
import { getPinContactState, type PinContactState } from '../services/pinContacts'
import { sendPinMessage } from '../services/messages'
import MessageComposer from './MessageComposer'
import { languageLabel } from '../services/languages'
import { kindLabel } from '../services/pinKinds'
import { placeLabel } from '../services/pinPlace'
import { sharePin } from '../services/shareProject'
import { showToast } from '../services/toast'
import type { Pin } from '../types'

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-sage" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

const ICONS = {
  globe: 'M12 22a10 10 0 100-20 10 10 0 000 20zM2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20',
  tag: 'M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L2 12V2h10l8.6 8.6a2 2 0 010 2.8zM7 7h.01',
  place: 'M12 22s8-6.5 8-12a8 8 0 10-16 0c0 5.5 8 12 8 12zM12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  calendar: 'M3 6a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2zM16 2v4M8 2v4M3 10h18',
  share: 'M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4-4 4M12 2v13',
  mail: 'M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zM22 6l-10 7L2 6',
}

function Row({ icon, label, children }: { icon: keyof typeof ICONS; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <Icon d={ICONS[icon]} />
      <div className="min-w-0">
        <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt>
        <dd className="mt-0.5 text-sm text-gray-900">{children}</dd>
      </div>
    </div>
  )
}

/** What a pin is, where, who speaks there, since when, and how to share it. Rows without data are left out. */
export default function PinDetails({ pin }: { pin: Pin }) {
  const { t, i18n } = useTranslation('map')
  const place = placeLabel(pin)
  const since = new Date(pin.created_at)
  const auth = useAuth()
  const [contactState, setContactState] = useState<{ pinId: string; state: PinContactState } | null>(null)
  const [composing, setComposing] = useState(false)
  // Re-asked after signing in: whether the caller is the contact depends on the session.
  const contact = contactState?.pinId === pin.id ? contactState.state : null

  useEffect(() => {
    let cancelled = false
    getPinContactState(pin.id).then(
      (state) => !cancelled && setContactState({ pinId: pin.id, state }),
      () => !cancelled && setContactState({ pinId: pin.id, state: 'none' }),
    )
    return () => {
      cancelled = true
    }
  }, [pin.id, auth.userId])

  function startMessage() {
    if (auth.loading) return
    if (!auth.userId) showToast(t('details.signInToMessage'), {
        label: t('details.signIn'),
        // Back to this pin, not just the map.
        onClick: () => {
          window.location.hash = loginUrl(`/mapa?pin=${encodeURIComponent(pin.id)}`)
        },
      })
    else if (!can(auth, 'messages.send')) showToast(t('details.cannotSend'))
    else setComposing(true)
  }

  async function share() {
    const result = await sharePin(pin.id, pin.title)
    if (result === 'copied') showToast(t('details.linkCopied'))
    else if (result === 'failed') showToast(t('details.shareFailed'))
  }

  return (
    <>
      {contact !== 'self' && (
        <button
          type="button"
          disabled={contact === null || contact === 'none'}
          title={contact === 'none' ? t('details.noContactTitle') : undefined}
          onClick={startMessage}
          className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand-primary text-sm font-medium text-brand-blush hover:bg-brand-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={ICONS.mail} />
          </svg>
          {t('message.send', { ns: 'common' })}
          {contact === 'none' && <span className="text-xs font-normal opacity-80">· {t('details.noContact')}</span>}
        </button>
      )}

      {composing && (
        <MessageComposer
          projectName={pin.title}
          onCancel={() => setComposing(false)}
          onSend={async (body) => {
            await sendPinMessage(pin.id, body)
            setComposing(false)
            showToast(t('details.sent'), {
              label: t('details.viewMessages'),
              onClick: () => {
                window.location.hash = '#/cuenta/mensajes'
              },
            })
          }}
        />
      )}

      <dl className="mt-4 space-y-3.5">
        {pin.languages.length > 0 && (
          <Row icon="globe" label={pin.languages.length > 1 ? t('details.languages') : t('details.language')}>
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {pin.languages.map((code) => (
                <li key={code} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">
                  {languageLabel(code)}
                </li>
              ))}
            </ul>
          </Row>
        )}
        {pin.kind && (
          <Row icon="tag" label={t('details.type')}>
            {kindLabel(pin.kind)}
          </Row>
        )}
        {place && (
          <Row icon="place" label={t('details.place')}>
            {place}
          </Row>
        )}
        {!Number.isNaN(since.getTime()) && (
          <Row icon="calendar" label={t('details.since')}>
            {new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' }).format(since)}
          </Row>
        )}
        <Row icon="share" label={t('details.share')}>
          <button type="button" onClick={share} className="text-brand-primary underline underline-offset-2 hover:text-brand-sage focus-visible:outline-2 focus-visible:outline-brand-sage">
            {t('details.copyLink')}
          </button>
        </Row>
      </dl>
    </>
  )
}
