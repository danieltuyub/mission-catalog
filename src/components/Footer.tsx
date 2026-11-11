export default function Footer() {
  return (
    <footer className="pb-5 pt-10">
      <div className="mx-auto w-[94%] rounded-3xl bg-brand-primary px-6 py-10 text-center text-brand-blush md:w-4/5">
        <p className="mx-auto max-w-2xl">
          Si quieres más información sobre las iglesias en casa, o de algún proyecto en particular,
          ponte en contacto con nosotros
        </p>
        <a
          href="#/contacto"
          className="mt-5 inline-block rounded-full bg-brand-blush px-6 py-2 text-sm font-medium text-brand-primary transition-colors hover:bg-brand-sage"
        >
          Contáctanos
        </a>
      </div>
    </footer>
  )
}
