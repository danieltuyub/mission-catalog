import type { Project, ProjectStatus } from '../types'

const STATUS: Record<ProjectStatus, { label: string; className: string }> = {
  open: { label: 'Abierto', className: 'bg-green-100 text-green-800' },
  paused: { label: 'Pausado', className: 'bg-yellow-100 text-yellow-800' },
  closed: { label: 'Cerrado', className: 'bg-red-100 text-red-800' },
}

const EMPTY = '—'

interface Props {
  project: Project
}

export default function ProjectCard({ project }: Props) {
  const status = STATUS[project.status]
  const details = [
    { label: 'País', value: project.country },
    { label: 'Región', value: project.region },
    { label: 'Teléfono', value: project.phone },
    { label: 'Mail', value: project.mail },
  ]

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl bg-white shadow ring-1 ring-black/5 sm:h-56 sm:flex-row">
      <div
        aria-hidden="true"
        className="flex h-44 shrink-0 items-center justify-center bg-stone-200 text-stone-400 sm:size-56"
      >
        <svg viewBox="0 0 24 24" className="size-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="8.5" cy="9.5" r="1.5" />
          <path d="M21 16l-5-5-8 8" />
        </svg>
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col p-5">
        <h3 className="truncate text-lg font-semibold text-brand-primary">{project.name}</h3>
        <p className="mt-1 line-clamp-2 min-h-10 text-sm text-stone-500">
          {project.description || 'Sin descripción'}
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
          className={`mt-4 self-end rounded-full px-3 py-1 text-xs font-medium sm:absolute sm:bottom-5 sm:right-5 sm:mt-0 ${status.className}`}
        >
          {status.label}
        </span>
      </div>
    </article>
  )
}
