import { useTranslation } from 'react-i18next'
import { projectUrl, type EditOrigin } from '../services/editOrigin'
import { projectPhotos } from '../services/projectImages'
import type { Project } from '../types'
import EditProjectLink from './EditProjectLink'
import SaveProjectButton from './SaveProjectButton'
import { STATUS_META, useStatusLabel } from './projectStatus'

const EMPTY = '—'

const formatDate = (dateString: string | null | undefined, language: string) => {
  if (!dateString) return null
  const date = new Date(dateString)
  // If the date is invalid (NaN timestamp), return null
  if (isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat(language, { dateStyle: 'long', timeZone: 'UTC' }).format(date)
}

interface Props {
  project: Project
  /** Called on a plain click on the card link (not for new-tab clicks). */
  onOpen?: () => void
  /** The list the card is in, so the project and its edit page lead back to it. Defaults to the public list. */
  from?: EditOrigin
  /** Shows the edit icon (admins only). */
  editable?: boolean
  /** Shows the heart when `onToggleSaved` is given. */
  saved?: boolean
  onToggleSaved?: () => void
  /** While the session or the saved marks are still loading. */
  saveDisabled?: boolean
}

export default function ProjectCard({
  project,
  onOpen,
  from,
  editable = false,
  saved = false,
  onToggleSaved,
  saveDisabled = false,
}: Props) {
  const { t, i18n } = useTranslation('projects')
  const statusLabel = useStatusLabel()
  const status = STATUS_META[project.status]
  const cover = projectPhotos(project)[0]
  const details = [
    { label: t('card.country'), value: project.country },
    { label: t('card.region'), value: project.region },
    { label: t('card.responsible'), value: project.responsible },
    {
      label: t('card.started'),
      value: formatDate(project.started_at, i18n.language),
    },
  ]

  return (
    <article className="relative flex flex-col overflow-hidden rounded-2xl bg-white shadow ring-1 ring-black/5 transition-shadow hover:shadow-md has-[h3_a:focus-visible]:ring-2 has-[h3_a:focus-visible]:ring-brand-sage motion-reduce:transition-none sm:h-56 sm:flex-row">
      <div
        aria-hidden="true"
        className="flex h-44 shrink-0 items-center justify-center bg-stone-200 text-stone-400 sm:size-56"
      >
        {cover ? (
          <img src={cover.src} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <svg viewBox="0 0 24 24" className="size-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <circle cx="8.5" cy="9.5" r="1.5" />
            <path d="M21 16l-5-5-8 8" />
          </svg>
        )}
      </div>

      {/* Top-right corner: over the photo when stacked (mobile), over the text from sm. Above the stretched title link. */}
      {(onToggleSaved || editable) && (
        <div className="absolute right-3 top-3 z-10 flex gap-2">
          {onToggleSaved && (
            <SaveProjectButton saved={saved} onToggle={onToggleSaved} disabled={saveDisabled} className="shadow-sm" />
          )}
          {editable && <EditProjectLink id={project.id} from={from ?? 'lista'} className="shadow-sm" />}
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col p-5">
        <h3
          className={`truncate text-lg font-semibold text-brand-primary ${
            onToggleSaved && editable ? 'sm:pr-24' : onToggleSaved || editable ? 'sm:pr-12' : ''
          }`}
        >
          {/* The whole card is the click target (stretched link). */}
          <a
            href={projectUrl(project.id, from)}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
              onOpen?.()
            }}
            className="outline-none after:absolute after:inset-0"
          >
            {project.name}
          </a>
        </h3>
        <p className="mt-1 line-clamp-2 min-h-10 text-sm text-stone-500">
          {project.description || t('card.noDescription')}
        </p>

        <dl className="mt-4 grid grid-cols-[5.5rem_minmax(0,1fr)] gap-y-1 text-sm">
          {details.map(({ label, value }, i) => (
            <div key={label} className="contents">
              <dt className="text-stone-500">{label}</dt>
              <dd
                title={value ?? undefined}
                className={`truncate text-brand-primary ${i === details.length - 1 ? 'pr-24' : ''}`}
              >
                {value || EMPTY}
              </dd>
            </div>
          ))}
        </dl>

        <span
          className={`mt-4 self-end rounded-full px-3 py-1 text-xs font-medium sm:absolute sm:bottom-5 sm:right-5 sm:mt-0 ${status.chip}`}
        >
          {statusLabel(project.status)}
        </span>
      </div>
    </article>
  )
}
