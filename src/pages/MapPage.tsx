import MapView from '../components/MapView'

export default function MapPage() {
  return (
    <div className="mx-auto w-[88%] py-6 md:w-[70%]">
      <div className="h-[calc(100vh-15rem)] min-h-[420px] overflow-hidden rounded-2xl shadow ring-1 ring-black/5">
        <MapView />
      </div>
    </div>
  )
}
