export type PinKind = 'person' | 'family' | 'house_church' | 'church'

export interface Pin {
  id: string
  title: string
  description: string
  /** Approximate: the real place is up to 1.5 km away and private (see `pin_location_privacy`). */
  lat: number
  lng: number
  created_at: string
  image_path: string | null
  /** Where it is; empty when not known yet. */
  country: string
  region: string
  city: string
  /** ISO 639 codes, at most 5. */
  languages: string[]
  /** Null for pins from before the type existed. */
  kind: PinKind | null
}

export type PinRequestStatus = 'pending' | 'approved' | 'rejected'

/** A pin proposed by a subscriber or creator, waiting for an admin. */
export interface PinRequest {
  id: string
  requested_by: string
  title: string
  description: string
  lat: number
  lng: number
  /** Path in the private `pin-request-images` bucket. */
  image_path: string | null
  country: string
  region: string
  city: string
  languages: string[]
  kind: PinKind | null
  status: PinRequestStatus
  created_at: string
}
