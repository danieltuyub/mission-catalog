import MapView from '../components/MapView'

export default function MapPage() {
  return (
    <div className="mx-auto w-[94%] pb-2 md:w-4/5">
      <div className="h-[calc(100vh-10rem)] min-h-[420px] overflow-hidden rounded-2xl shadow ring-1 ring-black/5">
        <MapView />
      </div>
    </div>
  )
}
