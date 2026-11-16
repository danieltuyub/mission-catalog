export interface Pin {
  id: string
  title: string
  description: string
  lat: number
  lng: number
  created_at: string
  image_path: string | null
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
  status: PinRequestStatus
  created_at: string
}
