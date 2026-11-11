import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MapContainer } from 'react-leaflet'
import { describe, expect, it, vi } from 'vitest'
import LocateControl from './LocateControl'

function setup(onLocate: () => Promise<[number, number] | null>, disabled = false) {
  render(
    <MapContainer center={[0, 0]} zoom={2}>
      <LocateControl onLocate={onLocate} zoom={15} disabled={disabled} />
    </MapContainer>,
  )
}

describe('LocateControl', () => {
  it('requests the location when clicked', async () => {
    const onLocate = vi.fn().mockResolvedValue(null)
    setup(onLocate)
    await userEvent.click(screen.getByRole('button', { name: 'Ir a mi ubicación' }))
    await waitFor(() => expect(onLocate).toHaveBeenCalledTimes(1))
  })

  it('does nothing when disabled', async () => {
    const onLocate = vi.fn().mockResolvedValue(null)
    setup(onLocate, true)
    await userEvent.click(screen.getByRole('button', { name: 'Geolocalización no disponible' }))
    expect(onLocate).not.toHaveBeenCalled()
  })
})
