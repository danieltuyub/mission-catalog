import { useEffect, useState, type FormEvent } from 'react'
import Pagination from '../../components/Pagination'
import { deletePin, getPins, pinImageUrl, updatePin } from '../../services/pinService'
import { showToast } from '../../services/toast'
import type { Pin } from '../../types'
import { ConfirmButton, Empty, LoadError, Loading, SearchBox } from './ui'
import { card, ghostButton, inputClass, matches, primaryButton } from './styles'

const PAGE_SIZE = 8

function PinEditor({ pin, onSaved, onCancel }: { pin: Pin; onSaved: (pin: Pin) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(pin.title)
  const [description, setDescription] = useState(pin.description)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      onSaved(await updatePin(pin.id, { title: title.trim(), description: description.trim() }))
    } catch {
      setError('No se pudo guardar el pin. Inténtalo de nuevo.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} aria-label={`Editar ${pin.title}`} className="mt-2 space-y-3">
      <label className="block text-sm text-stone-600">
        Título
        <input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} className={`${inputClass} mt-1 w-full`} />
      </label>
      <label className="block text-sm text-stone-600">
        Descripción
        <textarea
          value={description}
          maxLength={2000}
          rows={3}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand-sage focus:ring-1 focus:ring-brand-sage"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={saving || !title.trim()} className={primaryButton}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        <button type="button" onClick={onCancel} className={ghostButton}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

/** "Pines": every pin on the map. Edit its text or remove it. */
export default function PinsSection() {
  const [pins, setPins] = useState<Pin[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getPins().then(
      (list) => {
        if (cancelled) return
        setPins(list)
        setError(null)
      },
      () => !cancelled && setError('No se pudieron cargar los pines. Inténtalo de nuevo.'),
    )
    return () => {
      cancelled = true
    }
  }, [version])

  async function remove(pin: Pin) {
    setBusy(pin.id)
    try {
      await deletePin(pin)
      setPins((list) => (list ?? []).filter((p) => p.id !== pin.id))
      showToast('Pin eliminado')
    } catch {
      showToast('No se pudo eliminar el pin')
    }
    setBusy(null)
  }

  if (error && !pins) return <LoadError message={error} onRetry={() => setVersion((v) => v + 1)} />
  if (!pins) return <Loading />

  const filtered = query.trim() ? pins.filter((p) => matches(`${p.title} ${p.description}`, query)) : pins
  const totalPages = Math.max(Math.ceil(filtered.length / PAGE_SIZE), 1)
  const current = Math.min(page, totalPages)
  const shown = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  return (
    <section aria-label="Pines" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <SearchBox
          label="Buscar pin"
          value={query}
          onChange={(v) => {
            setQuery(v)
            setPage(1)
          }}
        />
        {totalPages > 1 && <Pagination page={current} totalPages={totalPages} onChange={setPage} />}
      </div>
      {shown.length === 0 ? (
        <Empty>{pins.length === 0 ? 'Aún no hay pines en el mapa.' : 'Ningún pin coincide con la búsqueda.'}</Empty>
      ) : (
        <ul className="space-y-3">
          {shown.map((pin) => (
            <li key={pin.id} className={`${card} flex gap-4`}>
              {pin.image_path && (
                <img src={pinImageUrl(pin.image_path)} alt="" loading="lazy" className="size-20 shrink-0 rounded-xl bg-stone-200 object-cover" />
              )}
              <div className="min-w-0 flex-1">
                {editing === pin.id ? (
                  <PinEditor
                    pin={pin}
                    onCancel={() => setEditing(null)}
                    onSaved={(saved) => {
                      setPins((list) => (list ?? []).map((p) => (p.id === saved.id ? saved : p)))
                      setEditing(null)
                      showToast('Pin actualizado')
                    }}
                  />
                ) : (
                  <>
                    <h3 title={pin.title} className="truncate font-semibold text-brand-primary">
                      {pin.title}
                    </h3>
                    {pin.description && <p className="mt-1 line-clamp-2 text-sm text-stone-500">{pin.description}</p>}
                    <p className="mt-2 text-xs text-stone-400">
                      {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => setEditing(pin.id)} className={ghostButton}>
                        Editar
                      </button>
                      <ConfirmButton label="Eliminar" confirmLabel="Sí, eliminar" disabled={busy !== null} onConfirm={() => remove(pin)} />
                    </div>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
