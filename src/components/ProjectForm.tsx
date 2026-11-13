import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { validateImage } from '../services/imageUtils'
import type { NewProject } from '../services/projectAdmin'
import type { ProjectStatus } from '../types'
import { STATUS_META, STATUS_ORDER } from './projectStatus'

export const MAX_IMAGES = 10
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface ProjectFormData {
  project: NewProject
  /** In display order: the first one is the cover. */
  images: File[]
}

interface Props {
  onSubmit: (data: ProjectFormData) => Promise<void>
  onCancel: () => void
}

interface Image {
  id: string
  file: File
  url: string
}

const control =
  'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-brand-sage focus:ring-1 focus:ring-brand-sage aria-invalid:border-red-500'

const sectionTitle = 'mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500'

const iconButton =
  'flex size-8 items-center justify-center rounded-full bg-white/90 text-brand-primary shadow hover:bg-white focus-visible:outline-2 focus-visible:outline-brand-sage disabled:opacity-30 disabled:hover:bg-white/90'

function Field({
  id,
  label,
  error,
  hint,
  className = '',
  children,
}: {
  id: string
  label: string
  error?: string
  hint?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={`text-sm text-gray-700 ${className}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

export default function ProjectForm({ onSubmit, onCancel }: Props) {
  const [values, setValues] = useState({
    name: '',
    responsible: '',
    description: '',
    details: '',
    started_at: '',
    country: '',
    region: '',
    phone: '',
    mail: '',
    status: 'open' as ProjectStatus,
  })
  const [errors, setErrors] = useState<{ name?: string; mail?: string }>({})
  const [images, setImages] = useState<Image[]>([])
  const [imageError, setImageError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Object URLs are released when an image is removed and when the form goes away.
  const latest = useRef(images)
  useEffect(() => {
    latest.current = images
  }, [images])
  useEffect(() => () => latest.current.forEach((i) => URL.revokeObjectURL(i.url)), [])

  const set = (key: keyof typeof values) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }))

  function addImages(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    let problem: string | null = null
    const accepted: Image[] = []
    for (const file of files) {
      const invalid = validateImage(file)
      if (invalid) problem = `${file.name}: ${invalid}`
      else if (images.length + accepted.length >= MAX_IMAGES) problem = `Máximo ${MAX_IMAGES} fotos`
      else accepted.push({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) })
    }
    setImageError(problem)
    if (accepted.length > 0) setImages((prev) => [...prev, ...accepted])
  }

  const removeImage = (id: string) => {
    const image = images.find((i) => i.id === id)
    if (image) URL.revokeObjectURL(image.url)
    setImages((prev) => prev.filter((i) => i.id !== id))
    setImageError(null)
  }

  const moveImage = (index: number, delta: -1 | 1) =>
    setImages((prev) => {
      const next = [...prev]
      const target = index + delta
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const name = values.name.trim()
    const mail = values.mail.trim()
    const found = {
      name: name ? undefined : 'El nombre es obligatorio',
      mail: mail && !EMAIL.test(mail) ? 'Escribe un correo válido' : undefined,
    }
    setErrors(found)
    if (found.name || found.mail) return

    const text = (v: string) => v.trim() || null
    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        project: {
          name,
          responsible: text(values.responsible),
          description: text(values.description),
          details: text(values.details),
          started_at: values.started_at || null,
          country: text(values.country),
          region: text(values.region),
          phone: text(values.phone),
          mail: text(mail),
          status: values.status,
        },
        images: images.map((i) => i.file),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el proyecto')
      setSaving(false)
    }
  }

  const invalid = (id: string, message?: string) =>
    message ? { 'aria-invalid': true, 'aria-describedby': `${id}-error` } : {}

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-label="Nuevo proyecto"
      className="space-y-5 rounded-2xl bg-white p-6 shadow ring-1 ring-black/5"
    >
      <section aria-labelledby="section-data">
        <h2 id="section-data" className={sectionTitle}>
          Datos del proyecto
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
        <Field id="project-name" label="Nombre *" error={errors.name} className="sm:col-span-2">
          <input
            id="project-name"
            autoFocus
            required
            value={values.name}
            onChange={set('name')}
            className={control}
            {...invalid('project-name', errors.name)}
          />
        </Field>

        <Field id="project-responsible" label="Responsable">
          <input id="project-responsible" value={values.responsible} onChange={set('responsible')} className={control} />
        </Field>

        <Field id="project-status" label="Estado">
          <select id="project-status" value={values.status} onChange={set('status')} className={control}>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>
        </Field>

        <Field id="project-description" label="Descripción" className="sm:col-span-2">
          <textarea id="project-description" rows={4} value={values.description} onChange={set('description')} className={`${control} resize-none`} />
        </Field>

        <Field
          id="project-details"
          label="Detalles"
          hint="Se muestra solo en la página del proyecto. Separa los párrafos con una línea en blanco."
          className="sm:col-span-2"
        >
          <textarea id="project-details" rows={7} value={values.details} onChange={set('details')} className={`${control} resize-y`} />
        </Field>

        </div>
      </section>

      <section aria-labelledby="section-contact" className="border-t border-stone-200 pt-5">
        <h2 id="section-contact" className={sectionTitle}>
          Ubicación y contacto
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
        <Field id="project-country" label="País">
          <input id="project-country" value={values.country} onChange={set('country')} className={control} />
        </Field>

        <Field id="project-region" label="Región">
          <input id="project-region" value={values.region} onChange={set('region')} className={control} />
        </Field>

        <Field id="project-started" label="Fecha de inicio">
          <input id="project-started" type="date" value={values.started_at} onChange={set('started_at')} className={control} />
        </Field>

        <Field id="project-phone" label="Teléfono">
          <input id="project-phone" type="tel" autoComplete="off" value={values.phone} onChange={set('phone')} className={control} />
        </Field>

        <Field id="project-mail" label="Mail" error={errors.mail} className="sm:col-span-2">
          <input
            id="project-mail"
            type="email"
            autoComplete="off"
            value={values.mail}
            onChange={set('mail')}
            className={control}
            {...invalid('project-mail', errors.mail)}
          />
        </Field>
        </div>
      </section>

      <fieldset className="border-t border-stone-200 pt-5">
        <legend className="sr-only">Fotos</legend>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-500">Fotos</h2>
            <p className="text-xs text-stone-500">La primera es la portada. Hasta {MAX_IMAGES}.</p>
          </div>
          <label className="inline-flex h-10 cursor-pointer items-center rounded-full bg-white px-4 text-sm text-brand-primary ring-1 ring-black/5 hover:bg-brand-blush has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-brand-sage">
            Agregar fotos
            <input type="file" accept="image/*" multiple onChange={addImages} className="sr-only" disabled={images.length >= MAX_IMAGES} />
          </label>
        </div>

        {imageError && (
          <p role="alert" className="mt-2 text-xs text-red-700">
            {imageError}
          </p>
        )}

        {images.length > 0 && (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {images.map((image, i) => (
              <li key={image.id} className="relative aspect-4/3 overflow-hidden rounded-xl bg-stone-200">
                <img src={image.url} alt={`Foto ${i + 1}`} className="size-full object-cover" />
                {i === 0 && (
                  <span className="absolute left-2 top-2 rounded-full bg-brand-primary/80 px-2 py-0.5 text-xs text-white">Portada</span>
                )}
                <div className="absolute inset-x-2 bottom-2 flex items-center justify-between">
                  <div className="flex gap-1">
                    <button type="button" aria-label={`Subir foto ${i + 1}`} disabled={i === 0} onClick={() => moveImage(i, -1)} className={iconButton}>
                      <Icon d="M15 18l-6-6 6-6" />
                    </button>
                    <button type="button" aria-label={`Bajar foto ${i + 1}`} disabled={i === images.length - 1} onClick={() => moveImage(i, 1)} className={iconButton}>
                      <Icon d="M9 6l6 6-6 6" />
                    </button>
                  </div>
                  <button type="button" aria-label={`Quitar foto ${i + 1}`} onClick={() => removeImage(image.id)} className={iconButton}>
                    <Icon d="M6 6l12 12M18 6L6 18" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="sticky bottom-0 z-10 -mx-6 -mb-6 flex justify-end gap-2 rounded-b-2xl border-t border-stone-200 bg-white/95 px-6 py-4 backdrop-blur">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="h-10 rounded-full px-5 text-sm text-brand-primary hover:bg-brand-blush/70 focus-visible:outline-2 focus-visible:outline-brand-sage disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="h-10 rounded-full bg-brand-primary px-6 text-sm font-medium text-brand-blush hover:bg-brand-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar proyecto'}
        </button>
      </div>
    </form>
  )
}
