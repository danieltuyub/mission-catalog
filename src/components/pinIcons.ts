import L from 'leaflet'

export const createPinIcon = (color: string) =>
  L.divIcon({
    className: '',
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -36],
    html: `<svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 0C7.2 0 0 7 0 15.7 0 27 16 40 16 40s16-13 16-24.300C32 7 24.800 0 16 0z" fill="${color}"/>
    <circle cx="16" cy="15.500" r="6" fill="#fff"/>
  </svg>`,
  })

export const pinIcon = createPinIcon('#0e1428')
export const selectedPinIcon = createPinIcon('#7b9e89')
