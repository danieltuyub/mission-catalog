// Gray placeholder with the same layout as the loaded detail, so nothing jumps when it fills in.
const Bar = ({ className }: { className: string }) => (
  <div className={`rounded-md bg-stone-200 ${className}`} />
)

interface Props {
  /** Keeps the layout reserved but invisible until it is worth showing. */
  visible?: boolean
}

export default function ProjectDetailSkeleton({ visible = true }: Props) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-hidden={!visible}
      className={
        visible
          ? 'animate-pulse opacity-100 transition-opacity duration-200 motion-reduce:animate-none'
          : 'opacity-0'
      }
    >
      <span className="sr-only">Cargando proyecto…</span>

      <div className="pb-5">
        <Bar className="h-8 w-56 max-w-full" />
      </div>

      <div className="rounded-2xl bg-white p-5 shadow ring-1 ring-black/5 md:p-6 lg:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-8">
          <div>
            <div className="aspect-4/3 rounded-xl bg-stone-200" />
            <div className="mt-3 flex gap-2 p-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 w-20 rounded-lg bg-stone-200" />
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <Bar className="h-4 w-full" />
              <Bar className="h-4 w-2/3" />
            </div>
            <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i}>
                  <Bar className="h-3.5 w-16" />
                  <Bar className="mt-2 h-5 w-32 max-w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-stone-100 pt-6">
          <div className="flex h-7 items-center">
            <Bar className="h-5 w-24" />
          </div>
          {/* Two paragraphs of ~3 lines each (26px line height), like the real text. */}
          <div className="mt-3 max-w-3xl space-y-4">
            {[0, 1].map((p) => (
              <div key={p} className="flex h-[78px] flex-col justify-between py-[5px]">
                <Bar className="h-4 w-full" />
                <Bar className="h-4 w-full" />
                <Bar className="h-4 w-3/5" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
