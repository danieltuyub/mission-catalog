import { act, render, screen } from '@testing-library/react'
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

describe('PinCard transitions', () => {
  it('stays mounted for the exit transition, then unmounts', () => {
    vi.useFakeTimers()
    try {
      const { rerender } = render(<PinCard pin={pin} onClose={vi.fn()} />)
      act(() => void vi.advanceTimersByTime(50))
      rerender(<PinCard pin={null} onClose={vi.fn()} />)
      expect(screen.getByRole('complementary')).toBeInTheDocument()
      act(() => void vi.advanceTimersByTime(200))
      expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('cross-fades content without remounting when another pin is selected', () => {
    vi.useFakeTimers()
    try {
      const { rerender } = render(<PinCard pin={pin} onClose={vi.fn()} />)
      act(() => void vi.advanceTimersByTime(50))
      const card = screen.getByRole('complementary')

      rerender(<PinCard pin={{ ...pin, id: '2', title: 'Otro' }} onClose={vi.fn()} />)
      // fading out: old content still there, hidden
      expect(screen.getByRole('heading', { name: 'Base' })).toBeInTheDocument()
      expect(screen.getByTestId('pin-content').className).toContain('opacity-0')

      act(() => void vi.advanceTimersByTime(500))
      expect(screen.getByRole('heading', { name: 'Otro' })).toBeInTheDocument()
      expect(screen.getByTestId('pin-content').className).toContain('opacity-100')
      expect(screen.getByRole('complementary')).toBe(card)
      expect(card.className).toContain('opacity-100')
    } finally {
      vi.useRealTimers()
    }
  })

  it('shows only the latest pin after rapid selections', () => {
    vi.useFakeTimers()
    try {
      const { rerender } = render(<PinCard pin={pin} onClose={vi.fn()} />)
      act(() => void vi.advanceTimersByTime(50))
      rerender(<PinCard pin={{ ...pin, id: '2', title: 'Dos' }} onClose={vi.fn()} />)
      act(() => void vi.advanceTimersByTime(30))
      rerender(<PinCard pin={{ ...pin, id: '3', title: 'Tres' }} onClose={vi.fn()} />)
      act(() => void vi.advanceTimersByTime(500))
      expect(screen.getByRole('heading', { name: 'Tres' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Dos' })).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('animates the card height to match the content', () => {
    let notify: ResizeObserverCallback = () => {}
    class FakeResizeObserver {
      constructor(cb: ResizeObserverCallback) {
        notify = cb
      }
      observe() {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
    try {
      render(<PinCard pin={pin} onClose={vi.fn()} />)
      const wrapper = screen.getByTestId('pin-content').parentElement!
      const entry = (blockSize: number) =>
        [{ borderBoxSize: [{ blockSize }] }] as unknown as ResizeObserverEntry[]

      act(() => notify(entry(120), {} as ResizeObserver))
      expect(wrapper.style.height).toBe('120px')
      act(() => notify(entry(260), {} as ResizeObserver))
      expect(wrapper.style.height).toBe('260px')
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
