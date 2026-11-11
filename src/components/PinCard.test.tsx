import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Pin } from '../types'
import PinCard from './PinCard'

const pin: Pin = {
  id: '1',
  title: 'Base',
  description: 'Main camp',
  lat: 1,
  lng: 2,
  created_at: '2026-01-01T00:00:00Z',
}

describe('PinCard', () => {
  it('shows title and description', () => {
    render(<PinCard pin={pin} onClose={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Base' })).toBeInTheDocument()
    expect(screen.getByText('Main camp')).toBeInTheDocument()
  })

  it('falls back when there is no description', () => {
    render(<PinCard pin={{ ...pin, description: '' }} onClose={vi.fn()} />)
    expect(screen.getByText('Sin descripción')).toBeInTheDocument()
  })

  it('calls onClose from the close button', async () => {
    const onClose = vi.fn()
    render(<PinCard pin={pin} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(onClose).toHaveBeenCalled()
  })
})
