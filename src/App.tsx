import Footer from './components/Footer'
import Navbar from './components/Navbar'
import { useRoute } from './hooks/useRoute'
import ContactPage from './pages/ContactPage'
import MapPage from './pages/MapPage'
import ProjectsPage from './pages/ProjectsPage'

const PAGES = {
  mapa: MapPage,
  proyectos: ProjectsPage,
  contacto: ContactPage,
}

export default function App() {
  const route = useRoute()
  const Page = PAGES[route]

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-b from-stone-50 to-stone-100">
      <Navbar current={route} />
      <main className="flex-1">
        <Page />
      </main>
      <Footer />
    </div>
  )
}
