import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Pin } from '../types'
import { getToast } from '../services/toast'
import PinCard from './PinCard'

const pin: Pin = {
  id: '1',
  title: 'Base',
  description: 'Main camp',
  lat: 1,
  lng: 2,
  created_at: '2026-01-01T00:00:00Z',
  image_path: null,
  country: 'México',
  region: 'Yucatán',
  city: 'Mérida',
  languages: ['es'],
  kind: 'family',
}

describe('PinCard', () => {
  it('shows title and description', () => {
    render(<PinCard pin={pin} onClose={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Base' })).toBeInTheDocument()
    expect(screen.getByText('Main camp')).toBeInTheDocument()
  })

  it('shows the pin image when there is one', () => {
    render(<PinCard pin={{ ...pin, image_path: 'a.webp' }} onClose={vi.fn()} />)
    expect(screen.getByRole('img', { name: 'Base' })).toHaveAttribute(
      'src',
      expect.stringContaining('pin-images/a.webp'),
    )
    expect(screen.queryByText('Foto')).not.toBeInTheDocument()
  })

  it('shows an edit button only when onEdit is given', async () => {
    const onEdit = vi.fn()
    const { rerender } = render(<PinCard pin={pin} onClose={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
    rerender(<PinCard pin={pin} onClose={vi.fn()} onEdit={onEdit} />)
    await userEvent.click(screen.getByRole('button', { name: 'Editar' }))
    expect(onEdit).toHaveBeenCalledWith(pin)
  })

  it('updates in place when the same pin is edited', () => {
    const { rerender } = render(<PinCard pin={pin} onClose={vi.fn()} />)
    rerender(<PinCard pin={{ ...pin, title: 'Editado' }} onClose={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Editado' })).toBeInTheDocument()
    expect(screen.getByTestId('pin-content')).toHaveClass('opacity-100')
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

  describe('details', () => {
    const full: Pin = { ...pin, kind: 'house_church', languages: ['es', 'quc'], created_at: '2021-11-02T00:00:00Z' }

    it('shows the languages as chips, the type, the place and since when', () => {
      render(<PinCard pin={full} onClose={vi.fn()} />)
      const languages = screen.getByText('Idiomas').closest('div')!
      expect(within(languages).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Español', "K'iche'"])
      expect(screen.getByText('Iglesia en casa')).toBeInTheDocument()
      expect(screen.getByText('Mérida, Yucatán, México')).toBeInTheDocument()
      expect(screen.getByText('noviembre de 2021')).toBeInTheDocument()
    })

    it('leaves out what the pin does not have', () => {
      render(<PinCard pin={{ ...full, languages: [], kind: null, country: '', region: '', city: '' }} onClose={vi.fn()} />)
      expect(screen.queryByText('Idiomas')).not.toBeInTheDocument()
      expect(screen.queryByText('Idioma')).not.toBeInTheDocument()
      expect(screen.queryByText('Tipo')).not.toBeInTheDocument()
      expect(screen.queryByText('Lugar')).not.toBeInTheDocument()
      expect(screen.getByText('En el mapa desde')).toBeInTheDocument()
    })

    it('says "Idioma" for a single one', () => {
      render(<PinCard pin={{ ...full, languages: ['es'] }} onClose={vi.fn()} />)
      expect(screen.getByText('Idioma')).toBeInTheDocument()
    })

    it('copies the link that opens the map on this pin', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
      render(<PinCard pin={full} onClose={vi.fn()} />)
      await userEvent.click(screen.getByRole('button', { name: 'Copiar enlace' }))
      expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/#\/mapa\?pin=1$/))
      expect(getToast()?.message).toBe('Enlace copiado')
    })

    it('has the message button, not available yet', () => {
      render(<PinCard pin={full} onClose={vi.fn()} />)
      expect(screen.getByRole('button', { name: /Enviar mensaje/ })).toBeDisabled()
    })
  })
})
