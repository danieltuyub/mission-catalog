import type { LatLngTuple } from 'leaflet'
import { useEffect, useMemo, useRef, useState } from 'react'
import AdminPinsMap from '../../components/AdminPinsMap'
import Combobox from '../../components/Combobox'
import Pagination from '../../components/Pagination'
import PinFormModal from '../../components/PinFormModal'
import { useUsers } from '../../hooks/useUsers'
import { languageLabel } from '../../services/languages'
import { kindLabel } from '../../services/pinKinds'
import { listPinContacts, setPinContact } from '../../services/pinContacts'
import { updatePinWithImage } from '../../services/pinEdit'
import { listPinLocations } from '../../services/pinLocations'
import { placeLabel, placeSuggestions } from '../../services/pinPlace'
import { deletePin, getPins, pinImageUrl } from '../../services/pinService'
import { showToast } from '../../services/toast'
import type { Pin } from '../../types'
import { Chips, ConfirmButton, Empty, LoadError, Loading, SearchBox } from './ui'
import { card, ghostButton, inputClass, matches } from './styles'

const PAGE_SIZE = 8
const NO_PINS: Pin[] = []
/** Filter value for pins without a country yet. */
const NO_COUNTRY = '\u0000'
const NO_REGION = '\u0000'
const ALL = ''
/** From here on the country filter is searchable instead of a plain list. */
const SEARCHABLE_FROM = 10

/** "Pines": every pin on the map. Edit its text or remove it. */
export default function PinsSection() {
  const [pins, setPins] = useState<Pin[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [country, setCountry] = useState(ALL)
  const [countryText, setCountryText] = useState('')
  const [region, setRegion] = useState(ALL)
  const [editing, setEditing] = useState<Pin | null>(null)
  const { users, nameOf } = useUsers()
  const [contacts, setContacts] = useState<Map<string, string>>(new Map())
  const [busy, setBusy] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // Below `lg` the list and the map take turns.
  const [view, setView] = useState<'list' | 'map'>('list')
  const [exact, setExact] = useState<Map<string, LatLngTuple>>(new Map())
  // A pin chosen on the map: its card is brought into view once its page is showing.
  const reveal = useRef<string | null>(null)

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

  // Who answers for each pin (private table): when it cannot be read the selectors just start empty.
  useEffect(() => {
    let cancelled = false
    listPinContacts().then(
      (map) => !cancelled && setContacts(map),
      () => {},
    )
    return () => {
      cancelled = true
    }
  }, [version])

  // The real places (private): when they cannot be read the map falls back to the approximate ones.
  useEffect(() => {
    let cancelled = false
    listPinLocations().then(
      (map) => !cancelled && setExact(map),
      () => {},
    )
    return () => {
      cancelled = true
    }
  }, [version])

  useEffect(() => {
    if (reveal.current !== selectedId || !selectedId) return
    reveal.current = null
    document.getElementById(`pin-card-${selectedId}`)?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
  }, [selectedId, page])

  const all = pins ?? NO_PINS
  // The same filters decide the list and the pins on the map.
  const filtered = useMemo(() => {
    const byCountry = country === ALL ? all : all.filter((p) => (country === NO_COUNTRY ? !p.country : p.country === country))
    const inCountry = country !== ALL && country !== NO_COUNTRY
    const byRegion = region === ALL || !inCountry ? byCountry : byCountry.filter((p) => (region === NO_REGION ? !p.region : p.region === region))
    return query.trim() ? byRegion.filter((p) => matches(`${p.title} ${p.description} ${placeLabel(p)}`, query)) : byRegion
  }, [all, country, region, query])
  const mapPins = useMemo(
    () => filtered.map((p) => ({ id: p.id, position: exact.get(p.id) ?? ([p.lat, p.lng] as LatLngTuple) })),
    [filtered, exact],
  )

  function selectFromMap(id: string) {
    const index = filtered.findIndex((p) => p.id === id)
    reveal.current = id
    setSelectedId(id)
    if (index >= 0) setPage(Math.floor(index / PAGE_SIZE) + 1)
  }

  async function changeContact(pin: Pin, userId: string) {
    setBusy(pin.id)
    try {
      await setPinContact(pin.id, userId || null)
      setContacts((map) => {
        const next = new Map(map)
        if (userId) next.set(pin.id, userId)
        else next.delete(pin.id)
        return next
      })
      showToast('Contacto actualizado')
    } catch {
      showToast('No se pudo guardar el contacto')
    }
    setBusy(null)
  }

  function chooseCountry(value: string) {
    setCountry(value)
    setRegion(ALL)
    setPage(1)
  }

  async function remove(pin: Pin) {
    setBusy(pin.id)
    try {
      await deletePin(pin)
      setPins((list) => (list ?? []).filter((p) => p.id !== pin.id))
      setSelectedId((id) => (id === pin.id ? null : id))
      showToast('Pin eliminado')
    } catch {
      showToast('No se pudo eliminar el pin')
    }
    setBusy(null)
  }

  if (error && !pins) return <LoadError message={error} onRetry={() => setVersion((v) => v + 1)} />
  if (!pins) return <Loading />

  const countries = placeSuggestions(pins, { country: '', region: '', city: '' }).countries
  const withoutCountry = pins.filter((p) => !p.country).length
  const byCountry = country === ALL ? pins : pins.filter((p) => (country === NO_COUNTRY ? !p.country : p.country === country))
  // The state filter only exists inside a country.
  const inCountry = country !== ALL && country !== NO_COUNTRY
  const regions = inCountry ? placeSuggestions(byCountry, { country: '', region: '', city: '' }).regions : []
  const withoutRegion = byCountry.filter((p) => !p.region).length
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
        <div className="flex flex-wrap items-center gap-3">
          {countries.length > SEARCHABLE_FROM ? (
            <div className="w-56">
              <Combobox
                id="pins-country-filter"
                aria-label="Filtrar por país"
                listLabel="Países con pines"
                placeholder={`Todos los países (${pins.length})`}
                text={countryText}
                options={[
                  { value: ALL, label: 'Todos los países' },
                  ...countries.map((c) => ({ value: c, label: `${c} (${pins.filter((p) => p.country === c).length})` })),
                  ...(withoutCountry > 0 ? [{ value: NO_COUNTRY, label: `Sin país (${withoutCountry})` }] : []),
                ]}
                onText={(text) => {
                  setCountryText(text)
                  // Clearing the text clears the filter.
                  if (!text.trim()) chooseCountry(ALL)
                }}
                onPick={(value) => {
                  setCountryText(value === ALL ? '' : value === NO_COUNTRY ? 'Sin país' : value)
                  chooseCountry(value)
                }}
                inputClassName={`${inputClass} w-full`}
              />
            </div>
          ) : (
            <select
              aria-label="Filtrar por país"
              value={country}
              onChange={(e) => chooseCountry(e.target.value)}
              className={inputClass}
            >
              <option value={ALL}>Todos los países ({pins.length})</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c} ({pins.filter((p) => p.country === c).length})
                </option>
              ))}
              {withoutCountry > 0 && <option value={NO_COUNTRY}>Sin país ({withoutCountry})</option>}
            </select>
          )}
          {inCountry && regions.length > 0 && (
            <select
              aria-label="Filtrar por estado"
              value={region}
              onChange={(e) => {
                setRegion(e.target.value)
                setPage(1)
              }}
              className={inputClass}
            >
              <option value={ALL}>Todos los estados</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r} ({byCountry.filter((p) => p.region === r).length})
                </option>
              ))}
              {withoutRegion > 0 && <option value={NO_REGION}>Sin estado ({withoutRegion})</option>}
            </select>
          )}
          {totalPages > 1 && <Pagination page={current} totalPages={totalPages} onChange={setPage} />}
        </div>
      </div>
      {/* Below `lg` the list and the map take turns. */}
      <div className="lg:hidden">
        <Chips
          label="Vista"
          value={view}
          onChange={setView}
          options={[
            { id: 'list', label: 'Lista' },
            { id: 'map', label: 'Mapa' },
          ]}
        />
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
        <div className={`space-y-4 ${view === 'map' ? 'hidden lg:block' : ''}`}>
      {shown.length === 0 ? (
        <Empty>{pins.length === 0 ? 'Aún no hay pines en el mapa.' : 'Ningún pin coincide con la búsqueda.'}</Empty>
      ) : (
        <ul className="space-y-3">
          {shown.map((pin) => {
            const selected = pin.id === selectedId
            return (
              <li
                key={pin.id}
                id={`pin-card-${pin.id}`}
                // Clicking the card (not its controls) shows the pin on the map.
                onClick={(e) => {
                  if (!(e.target as HTMLElement).closest('button, select, a, label, input')) setSelectedId(pin.id)
                }}
                className={`${card} flex cursor-pointer gap-4 ${selected ? 'ring-2 ring-brand-sage' : ''}`}
              >
                {pin.image_path && (
                  <img src={pinImageUrl(pin.image_path)} alt="" loading="lazy" className="size-20 shrink-0 rounded-xl bg-stone-200 object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold text-brand-primary">
                    <button
                      type="button"
                      title="Ver en el mapa"
                      aria-label={`${pin.title}: ver en el mapa`}
                      aria-pressed={selected}
                      onClick={() => setSelectedId(pin.id)}
                      className="max-w-full truncate text-left hover:underline focus-visible:outline-2 focus-visible:outline-brand-sage"
                    >
                      {pin.title}
                    </button>
                  </h3>
                  {pin.description && <p className="mt-1 line-clamp-2 text-sm text-stone-500">{pin.description}</p>}
                  <p className="mt-2 text-xs text-stone-400">
                    {[kindLabel(pin.kind), placeLabel(pin) || 'Sin país'].filter(Boolean).join(' · ')}
                  </p>
                  {pin.languages.length > 0 && (
                    <ul aria-label="Idiomas" className="mt-1.5 flex flex-wrap gap-1.5">
                      {pin.languages.map((code) => (
                        <li key={code} className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs text-stone-600">
                          {languageLabel(code)}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-sm text-stone-600">
                      Contacto
                      <select
                        aria-label={`Contacto de ${pin.title}`}
                        value={contacts.get(pin.id) ?? ''}
                        disabled={busy !== null}
                        onChange={(e) => changeContact(pin, e.target.value)}
                        className={`${inputClass} max-w-56`}
                      >
                        <option value="">Sin contacto</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {nameOf(u.id)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(pin.id)
                          setView('map')
                        }}
                        className={`${ghostButton} lg:hidden`}
                      >
                        Ver en el mapa
                      </button>
                      <button type="button" onClick={() => setEditing(pin)} className={ghostButton}>
                        Editar
                      </button>
                      <ConfirmButton label="Eliminar" confirmLabel="Sí, eliminar" disabled={busy !== null} onConfirm={() => remove(pin)} />
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
        </div>
        <div className={`${view === 'list' ? 'hidden lg:block' : ''} lg:sticky lg:top-4`}>
          <AdminPinsMap
            pins={mapPins}
            selectedId={selectedId}
            onSelect={selectFromMap}
            visible={view === 'map'}
            className="h-[70vh] lg:h-[calc(100vh-6rem)]"
          />
        </div>
      </div>

      {editing && (
        <PinFormModal
          key={editing.id}
          lat={editing.lat}
          lng={editing.lng}
          exactPosition={exact.get(editing.id)}
          pin={editing}
          known={pins}
          onCancel={() => setEditing(null)}
          onSubmit={async ({ image, removeImage, ...data }) => {
            const saved = await updatePinWithImage(editing, data, image, removeImage)
            setPins((list) => (list ?? []).map((p) => (p.id === saved.id ? saved : p)))
            setEditing(null)
            showToast('Pin actualizado')
          }}
        />
      )}
    </section>
  )
}
