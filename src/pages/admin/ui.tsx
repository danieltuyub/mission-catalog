import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { dangerButton, ghostButton, inputClass } from './styles'

export function Loading() {
  const { t } = useTranslation('admin')
  return <p className="py-10 text-center text-stone-500">{t('loading')}</p>
}

export function LoadError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useTranslation('admin')
  return (
    <div role="alert" className="rounded-2xl bg-white p-6 text-sm text-red-700 shadow ring-1 ring-black/5">
      <p>{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className={`${ghostButton} mt-3`}>
          {t('retry')}
        </button>
      )}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl bg-white p-6 text-sm text-stone-500 shadow ring-1 ring-black/5">{children}</p>
}

/** A destructive button that asks for confirmation before acting: nothing here can be undone. */
export function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  disabled,
}: {
  label: string
  confirmLabel: string
  onConfirm: () => void
  disabled?: boolean
}) {
  const { t } = useTranslation('admin')
  const [asking, setAsking] = useState(false)
  if (!asking)
    return (
      <button type="button" disabled={disabled} onClick={() => setAsking(true)} className={`${ghostButton} text-red-700`}>
        {label}
      </button>
    )
  return (
    <span className="inline-flex items-center gap-2" role="group" aria-label={t('confirm')}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setAsking(false)
          onConfirm()
        }}
        className={dangerButton}
      >
        {confirmLabel}
      </button>
      <button type="button" onClick={() => setAsking(false)} className={ghostButton}>
        {t('cancel')}
      </button>
    </span>
  )
}

/** Pill row used for the choices inside a section. */
export function Chips<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  options: readonly { id: T; label: string; count?: number }[]
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={o.id === value}
          onClick={() => onChange(o.id)}
          className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm ring-1 ring-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage ${
            o.id === value ? 'bg-brand-primary font-medium text-brand-blush' : 'bg-white text-brand-primary hover:bg-brand-blush'
          }`}
        >
          {o.label}
          {o.count !== undefined && (
            <span className={`rounded-full px-2 py-0.5 text-[11px] ${o.id === value ? 'bg-white/15' : 'bg-stone-200 text-stone-600'}`}>
              {o.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export function SearchBox({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <input
      type="search"
      aria-label={label}
      placeholder={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputClass} w-full sm:w-72`}
    />
  )
}
