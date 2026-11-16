import type { ComponentType } from 'react'
import Footer from './components/Footer'
import Navbar from './components/Navbar'
import RequireAuth from './components/RequireAuth'
import Toaster from './components/Toaster'
import { useEditProjectId, useIsNewProject, useProjectId, useRoute, type Route } from './hooks/useRoute'
import AccountPage from './pages/AccountPage'
import AdminPage from './pages/AdminPage'
import ContactPage from './pages/ContactPage'
import LoginPage from './pages/LoginPage'
import MapPage from './pages/MapPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import ProjectEditPage from './pages/ProjectEditPage'
import ProjectFormPage from './pages/ProjectFormPage'
import ProjectsPage from './pages/ProjectsPage'

const PAGES: Record<Exclude<Route, 'login'>, ComponentType> = {
  mapa: MapPage,
  proyectos: ProjectsPage,
  contacto: ContactPage,
  cuenta: AccountPage,
  admin: () => (
    <RequireAuth permission="users.manage">
      <AdminPage />
    </RequireAuth>
  ),
}

export default function App() {
  const route = useRoute()
  const projectId = useProjectId()
  const newProject = useIsNewProject()
  const editId = useEditProjectId()
  // The login is a standalone screen: no navbar or footer.
  if (route === 'login') return <LoginPage />
  const Page = PAGES[route]

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-b from-stone-50 to-stone-100">
      <Navbar current={route} />
      <main className="flex-1">
        {newProject ? (
          <RequireAuth permission="projects.create">
            <ProjectFormPage />
          </RequireAuth>
        ) : editId ? (
          <RequireAuth permission={['projects.update_any', 'projects.update_own']}>
            <ProjectEditPage key={editId} id={editId} />
          </RequireAuth>
        ) : projectId ? (
          <ProjectDetailPage key={projectId} id={projectId} />
        ) : (
          <Page />
        )}
      </main>
      <Footer />
      <Toaster />
    </div>
  )
}
