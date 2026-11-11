import { useEffect, useState, type FormEvent } from 'react'

interface Props {
  lat: number
  lng: number
  onSubmit: (data: { title: string; description: string }) => Promise<void>
  onCancel: () => void
}

export default function PinFormModal({ lat, lng, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !saving && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel, saving])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSubmit({ title: title.trim(), description: description.trim() })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the pin')
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
        aria-label="New pin"
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-3 rounded-xl bg-white p-5 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-gray-900">New pin</h2>
        <p className="text-xs text-gray-500">
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>

        <label className="block text-sm text-gray-700">
          Title
          <input
            autoFocus
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-brand-sage focus:ring-1 focus:ring-brand-sage"
          />
        </label>

        <label className="block text-sm text-gray-700">
          Description
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-brand-sage focus:ring-1 focus:ring-brand-sage"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
