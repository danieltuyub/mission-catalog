import ProjectCard from '../components/ProjectCard'
import { useProjects } from '../hooks/useProjects'

export default function ProjectsPage() {
  const { projects, loading, error } = useProjects()

  return (
    <div className="mx-auto w-[94%] md:w-4/5">
      <h1 className="sr-only">Proyectos</h1>
      {loading && <p className="py-24 text-center text-stone-500">Cargando proyectos…</p>}
      {error && (
        <p role="alert" className="py-24 text-center text-red-700">
          No se pudieron cargar los proyectos: {error}
        </p>
      )}
      {!loading && !error && projects.length === 0 && (
        <p className="py-24 text-center text-stone-500">Aún no hay proyectos</p>
      )}
      <ul className="space-y-5">
        {projects.map((project) => (
          <li key={project.id}>
            <ProjectCard project={project} />
          </li>
        ))}
      </ul>
    </div>
  )
}
