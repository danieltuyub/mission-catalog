import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { validateImage } from '../services/imageUtils'
import { isValidCountry } from '../services/countries'
import { canonicalPlace, EMPTY_PLACE } from '../services/pinPlace'
import { pinImageUrl } from '../services/pinService'
import { isPinKind } from '../services/pinKinds'
import PinAttributeFields from './PinAttributeFields'
import PlaceFields from './PlaceFields'
import type { Pin, PinKind } from '../types'

interface Props {
  lat: number
  lng: number
  /** When set, the form edits this pin instead of creating one. */
  pin?: Pin
  /** The pin is proposed, not published: an admin reviews it first. */
  request?: boolean
  /** Pins already on the map: their places are suggested, and their spelling is kept. */
  known?: Pin[]
  onSubmit: (data: {
    title: string
    description: string
    country: string
    region: string
    city: string
    kind: PinKind
    languages: string[]
    image?: File
    removeImage?: boolean
  }) => Promise<void>
  onCancel: () => void
}

export default function PinFormModal({ lat, lng, pin, request = false, known = [], onSubmit, onCancel }: Props) {
  const heading = pin ? 'Editar pin' : request ? 'Solicitar pin' : 'Nuevo pin'
  const [title, setTitle] = useState(pin?.title ?? '')
  const [description, setDescription] = useState(pin?.description ?? '')
  const [place, setPlace] = useState(pin ?? EMPTY_PLACE)
  const [attrs, setAttrs] = useState({ kind: pin?.kind ?? '', languages: pin?.languages ?? [] })
  const [removed, setRemoved] = useState(false)
  const [image, setImage] = useState<{ file: File; url: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !saving && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel, saving])

  useEffect(() => {
    if (!image) return
    return () => URL.revokeObjectURL(image.url)
  }, [image])

  function handleImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return setImage(null)
    const problem = validateImage(file)
    if (problem) {
      e.target.value = ''
      setImage(null)
      return setError(problem)
    }
    setError(null)
    setImage({ file, url: URL.createObjectURL(file) })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!isValidCountry(place.country, pin?.country) || !isPinKind(attrs.kind)) return
    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        ...canonicalPlace(place, known),
        kind: attrs.kind as PinKind,
        languages: attrs.languages,
        image: image?.file,
        removeImage: removed && !image ? true : undefined,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : request ? 'No se pudo enviar la solicitud' : 'No se pudo guardar el pin')
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !saving && onCancel()}
    >
      <form
        role="dialog"
        aria-label={heading}
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-3 rounded-xl bg-white p-5 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-gray-900">{heading}</h2>
        <p className="text-xs text-gray-500">
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>
        {request && (
          <p className="rounded-md bg-brand-blush/40 px-3 py-2 text-sm text-brand-primary">
            Un administrador revisará tu solicitud antes de publicar el pin.
          </p>
        )}

        <label className="block text-sm text-gray-700">
          Título
          <input
            autoFocus
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-brand-sage focus:ring-1 focus:ring-brand-sage"
          />
        </label>

        <label className="block text-sm text-gray-700">
          Descripción
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-brand-sage focus:ring-1 focus:ring-brand-sage"
          />
        </label>

        <PlaceFields
          value={place}
          onChange={setPlace}
          known={known}
          currentCountry={pin?.country}
          labelClassName="block text-sm text-gray-700"
          inputClassName="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-brand-sage focus:ring-1 focus:ring-brand-sage"
        />

        <PinAttributeFields
          value={attrs}
          onChange={setAttrs}
          labelClassName="block text-sm text-gray-700"
          inputClassName="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-brand-sage focus:ring-1 focus:ring-brand-sage"
        />

        <label className="block text-sm text-gray-700">
          Imagen
          <input
            type="file"
            accept="image/*"
            onChange={handleImage}
            className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-blush file:px-3 file:py-2 file:text-sm file:text-brand-primary hover:file:bg-brand-blush/70"
          />
        </label>
        {image ? (
          <img src={image.url} alt="Vista previa" className="h-32 w-full rounded-lg object-cover" />
        ) : (
          pin?.image_path &&
          !removed && (
            <div className="relative">
              <img
                src={pinImageUrl(pin.image_path)}
                alt="Imagen actual"
                className="h-32 w-full rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={() => setRemoved(true)}
                className="absolute right-2 top-2 rounded-full bg-white/90 px-3 py-1 text-xs text-gray-700 shadow hover:bg-white"
              >
                Quitar imagen
              </button>
            </div>
          )
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || !title.trim() || !isValidCountry(place.country, pin?.country) || !isPinKind(attrs.kind)}
            className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90 disabled:opacity-50"
          >
            {request ? (saving ? 'Enviando…' : 'Enviar solicitud') : saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  )
}
