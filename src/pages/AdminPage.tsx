import PageHeader from '../components/PageHeader'

/** Placeholder: the admin panel is still to come. */
export default function AdminPage() {
  return (
    <div className="mx-auto w-[94%] md:w-4/5">
      <PageHeader title="Administración" />
      <div className="rounded-2xl bg-white p-6 text-stone-600 shadow ring-1 ring-black/5">
        <p>Aquí estarán los usuarios, los proyectos, los pines y las solicitudes.</p>
        <p className="mt-1 text-sm text-stone-500">Esta sección estará disponible pronto.</p>
        <a
          href="#/cuenta"
          className="mt-4 inline-flex h-10 items-center rounded-full bg-white px-4 text-sm text-brand-primary ring-1 ring-black/5 hover:bg-brand-blush focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-sage"
        >
          Ir a Mi cuenta
        </a>
      </div>
    </div>
  )
}
