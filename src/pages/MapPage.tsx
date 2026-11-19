import MapView from '../components/MapView'

export default function MapPage() {
  return (
    <div className="mx-auto md:w-4/5">
      <div className="h-[calc(100dvh-10rem)] min-h-[420px] overflow-hidden shadow ring-1 ring-black/5 md:rounded-2xl">
        <MapView />
      </div>
    </div>
  )
}
