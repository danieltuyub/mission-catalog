import { useEffect, useState, type ReactNode } from 'react'
import EditProjectLink from '../components/EditProjectLink'
import MessageComposer from '../components/MessageComposer'
import PageHeader from '../components/PageHeader'
import PhotoCarousel from '../components/PhotoCarousel'
import SaveProjectButton from '../components/SaveProjectButton'
import SendMessageButton from '../components/SendMessageButton'
import ProjectDetailSkeleton from '../components/ProjectDetailSkeleton'
import { STATUS_META } from '../components/projectStatus'
import { useDelayed } from '../hooks/useDelayed'
import { useAuth } from '../hooks/useAuth'
import { useProject } from '../hooks/useProject'
import { useSavedProjects } from '../hooks/useSavedProjects'
import { loginToastAction, loginUrl } from '../services/authRedirect'
import { sendProjectMessage } from '../services/messages'
import { can, canEditProject } from '../services/permissions'
import { projectPhotos } from '../services/projectImages'
import { clearOpenedFromList, loadOpenedFromList, resetListContext } from '../services/projectsViewStorage'
import { showToast } from '../services/toast'
import { SKELETON_DELAY_MS } from './projectsConfig'

const EMPTY = '—'

const dateFormat = new Intl.DateTimeFormat('es', { dateStyle: 'long', timeZone: 'UTC' })

/** Blank-line separated paragraphs; empty when there is no text. */
function paragraphs(text: string | null | undefined): string[] {
  return (text ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}

const formatDate = (dateString?: string | null) => {
  if (!dateString) return null
  const date = new Date(dateString)
  // If the date is invalid (NaN timestamp), return null
  if (isNaN(date.getTime())) return null
  return dateFormat.format(date)
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-stone-500">{label}</dt>
      <dd className="mt-0.5 break-words text-brand-primary">{children}</dd>
    </div>
  )
}

const linkClass =
  'underline decoration-stone-300 underline-offset-2 hover:decoration-brand-primary focus-visible:outline-2 focus-visible:outline-brand-sage'

export default function ProjectDetailPage({ id }: { id: string }) {
  const { project, loading, error, full } = useProject(id)
  const auth = useAuth()
  const { isSaved, toggle: toggleSaved, loading: savedLoading } = useSavedProjects()
  const [composing, setComposing] = useState(false)
  const showSkeleton = useDelayed(loading, SKELETON_DELAY_MS)
  // True when opened from the list (its filters, sort and page are kept for the way back).
  const [fromList] = useState(() => loadOpenedFromList())

  useEffect(() => {
    window.scrollTo(0, 0)
    clearOpenedFromList()
    // Arrived by URL: the back link must lead to an unfiltered list.
    if (!fromList) resetListContext()
  }, [fromList])

  const status = project ? STATUS_META[project.status] : null

  return (
    <div className="mx-auto w-[94%] md:w-4/5">
      <nav aria-label="Volver" className="flex flex-wrap items-center gap-x-3 gap-y-1 pb-4">
        <a
          href="#/proyectos"
          className="inline-flex h-10 items-center gap-2 rounded-full bg-white pl-3 pr-4 text-sm text-brand-primary ring-1 ring-black/5 hover:bg-brand-blush focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Proyectos
        </a>
        {project && (
          <div className="ml-auto flex items-center gap-2">
            {/* You cannot write to yourself. */}
            {(!project.created_by || project.created_by !== auth.userId) && (
              <SendMessageButton
                unavailable={!project.created_by}
                title={project.created_by ? 'Enviar mensaje' : 'Este proyecto aún no tiene un contacto asignado'}
                onClick={() => {
                  if (auth.loading) return
                  if (!auth.userId) showToast('Inicia sesión para enviar mensajes', loginToastAction())
                  else if (!can(auth, 'messages.send')) showToast('Tu cuenta no puede enviar mensajes')
                  else setComposing(true)
                }}
              />
            )}
            <SaveProjectButton
              saved={isSaved(project.id)}
              onToggle={() => toggleSaved(project.id)}
              disabled={savedLoading}
            />
            {canEditProject(auth, project) && <EditProjectLink id={project.id} />}
          </div>
        )}
      </nav>

      {composing && project && (
        <MessageComposer
          projectName={project.name}
          onCancel={() => setComposing(false)}
          onSend={async (body) => {
            await sendProjectMessage(project.id, body)
            setComposing(false)
            showToast('Mensaje enviado', {
              label: 'Ver mensajes',
              onClick: () => {
                window.location.hash = '#/cuenta/mensajes'
              },
            })
          }}
        />
      )}

      {loading ? (
        <ProjectDetailSkeleton visible={showSkeleton} />
      ) : (
        <div className="animate-fade-in motion-reduce:animate-none">
          <PageHeader
            title={project?.name ?? (error ? 'Proyecto' : 'Proyecto no encontrado')}
            badge={
              status && (
                <span className={`translate-y-0.5 rounded-full px-3 py-1 text-xs font-medium ${status.chip}`}>
                  {status.label}
                </span>
              )
            }
          />

          {error && (
            <p role="alert" className="py-24 text-center text-red-700">
              No se pudo cargar el proyecto: {error}
            </p>
          )}
          {!error && !project && (
            <p className="py-24 text-center text-stone-500">No existe un proyecto con ese enlace.</p>
          )}

          {project && (
            <article className="rounded-2xl bg-white p-5 shadow ring-1 ring-black/5 md:p-6 lg:p-8">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-8">
                {/* Placeholder slides when the project has no photos. */}
                <PhotoCarousel photos={projectPhotos(project)} />
                <div className="min-w-0 space-y-6">
                  <p className="leading-relaxed text-stone-600">{project.description || 'Sin descripción'}</p>
                  <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                    <Field label="Encargado">{project.responsible || EMPTY}</Field>
                    <Field label="Inicio">
                      {formatDate(project.started_at) || EMPTY}
                    </Field>
                    <Field label="País">{project.country || EMPTY}</Field>
                    <Field label="Región">{project.region || EMPTY}</Field>
                    {full && (
                      <>
                    <Field label="Teléfono">
                      {project.phone ? (
                        <a href={`tel:${project.phone.replace(/[^\d+]/g, '')}`} className={linkClass}>
                          {project.phone}
                        </a>
                      ) : (
                        EMPTY
                      )}
                    </Field>
                    <Field label="Mail">
                      {project.mail ? (
                        <a href={`mailto:${project.mail}`} className={linkClass}>
                          {project.mail}
                        </a>
                      ) : (
                        EMPTY
                      )}
                    </Field>
                      </>
                    )}
                    <Field label="Actualizado">
                      {formatDate(project.updated_at) || EMPTY}
                    </Field>
                  </dl>
                </div>
              </div>

              {full ? (
              <section aria-labelledby="project-details" className="mt-8 border-t border-stone-100 pt-6">
                <h2 id="project-details" className="text-lg font-semibold text-brand-primary">
                  Detalles
                </h2>
                <div className="mt-3 max-w-3xl space-y-4 leading-relaxed text-stone-600">
                  {paragraphs(project.details).map((text, i) => (
                    <p key={i} className="whitespace-pre-line">
                      {text}
                    </p>
                  ))}
                  {paragraphs(project.details).length === 0 && <p className="text-stone-500">Sin detalles</p>}
                </div>
              </section>
              ) : (
                <section
                  aria-label="Acceso restringido"
                  className="mt-8 border-t border-stone-100 pt-6 text-stone-600"
                >
                  <p>Inicia sesión para ver el detalle completo, la información de contacto y todas las fotos.</p>
                  <a
                    href={loginUrl(`/proyectos/${project.id}`)}
                    className="mt-3 inline-flex h-10 items-center rounded-full bg-brand-primary px-5 text-sm font-medium text-brand-blush hover:bg-brand-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage"
                  >
                    Iniciar sesión
                  </a>
                </section>
              )}
            </article>
          )}
        </div>
      )}
    </div>
  )
}
