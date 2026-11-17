import type { LatLngTuple } from 'leaflet'
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { validateImage } from '../services/imageUtils'
import { isValidCountry } from '../services/countries'
import { canonicalPlace, EMPTY_PLACE } from '../services/pinPlace'
import { pinImageUrl } from '../services/pinService'
import { isPinKind } from '../services/pinKinds'
import FormSelect from './FormSelect'
import PinAttributeFields from './PinAttributeFields'
import PlaceFields from './PlaceFields'
import type { Pin, PinKind } from '../types'

interface Props {
  lat: number
  lng: number
  /** The exact place, when it is known (admins): a stored pin only carries an approximate one. */
  exactPosition?: LatLngTuple
  /** When set, the form edits this pin instead of creating one. */
  pin?: Pin
  /** The pin is proposed, not published: an admin reviews it first. */
  request?: boolean
  /** Pins already on the map: their places are suggested, and their spelling is kept. */
  known?: Pin[]
  /** Who answers messages for this pin; only offered when editing (a new pin's contact is whoever creates it). */
  contact?: { value: string; options: { id: string; name: string }[] }
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
    contact?: string
  }) => Promise<void>
  onCancel: () => void
}

export default function PinFormModal({ lat, lng, exactPosition, pin, request = false, known = [], contact, onSubmit, onCancel }: Props) {
  const heading = pin ? 'Editar pin' : request ? 'Solicitar pin' : 'Nuevo pin'
  const [title, setTitle] = useState(pin?.title ?? '')
  const [description, setDescription] = useState(pin?.description ?? '')
  const [place, setPlace] = useState(pin ?? EMPTY_PLACE)
  const [attrs, setAttrs] = useState({ kind: pin?.kind ?? '', languages: pin?.languages ?? [] })
  const [contactId, setContactId] = useState(contact?.value ?? '')
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
        contact: pin && contact ? contactId : undefined,
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
        className="flex max-h-[92vh] w-full max-w-sm flex-col rounded-xl bg-white shadow-xl md:max-w-3xl"
      >
        <div className="space-y-2 px-5 pt-5">
          <h2 className="text-lg font-semibold text-gray-900">{heading}</h2>
          {(!pin || exactPosition) && (
            <p className="text-xs text-gray-500">
              {(exactPosition?.[0] ?? lat).toFixed(5)}, {(exactPosition?.[1] ?? lng).toFixed(5)}
            </p>
          )}
          {request && (
            <p className="rounded-md bg-brand-blush/40 px-3 py-2 text-sm text-brand-primary">
              Un administrador revisará tu solicitud antes de publicar el pin.
            </p>
          )}
        </div>

        <div className="grid flex-1 gap-x-6 gap-y-3 overflow-y-auto px-5 py-3 md:grid-cols-2">
          <div className="space-y-3">
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
          </div>
          <div className="space-y-3">
            <PlaceFields
              value={place}
              onChange={setPlace}
              known={known}
              currentCountry={pin?.country}
              className="grid gap-3 sm:grid-cols-2"
              labelClassName="block text-sm text-gray-700"
              inputClassName="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-brand-sage focus:ring-1 focus:ring-brand-sage"
            />

            <PinAttributeFields
              value={attrs}
              onChange={setAttrs}
              labelClassName="block text-sm text-gray-700"
              inputClassName="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-brand-sage focus:ring-1 focus:ring-brand-sage"
            />

            {pin && contact && (
              <label className="block text-sm text-gray-700">
                Contacto
                <FormSelect
                  value={contactId}
                  onChange={(e) => setContactId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-brand-sage focus:ring-1 focus:ring-brand-sage"
                >
                  <option value="">Sin contacto</option>
                  {contact.options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </FormSelect>
                <span className="mt-1 block text-xs text-gray-500">Recibe los mensajes enviados desde este pin.</span>
              </label>
            )}

          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3">
          {error && (
            <p role="alert" className="mr-auto text-sm text-red-600">
              {error}
            </p>
          )}
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
