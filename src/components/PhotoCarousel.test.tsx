import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import PhotoCarousel from './PhotoCarousel'

const slides = () => screen.getAllByRole('group', { hidden: true })
const visibleSlide = () => slides().findIndex((s) => s.getAttribute('aria-hidden') === 'false') + 1

describe('PhotoCarousel', () => {
  it('shows three placeholder slides by default', () => {
    render(<PhotoCarousel />)
    expect(screen.getByRole('region', { name: 'Fotos del proyecto' })).toHaveAttribute(
      'aria-roledescription',
      'carousel',
    )
    expect(slides()).toHaveLength(3)
    expect(visibleSlide()).toBe(1)
    expect(screen.getAllByRole('button', { name: /Ir a la foto/ })).toHaveLength(3)
  })

  it('moves with the arrows and loops around', async () => {
    render(<PhotoCarousel />)
    await userEvent.click(screen.getByRole('button', { name: 'Foto siguiente' }))
    expect(visibleSlide()).toBe(2)
    await userEvent.click(screen.getByRole('button', { name: 'Foto siguiente' }))
    await userEvent.click(screen.getByRole('button', { name: 'Foto siguiente' }))
    expect(visibleSlide()).toBe(1)
    await userEvent.click(screen.getByRole('button', { name: 'Foto anterior' }))
    expect(visibleSlide()).toBe(3)
  })

  it('handles several quick clicks without losing steps', () => {
    render(<PhotoCarousel />)
    const next = screen.getByRole('button', { name: 'Foto siguiente' })
    next.click()
    next.click()
    next.click()
    expect(visibleSlide()).toBe(1)
  })

  it('jumps with the thumbnails and marks the current one', async () => {
    render(<PhotoCarousel />)
    await userEvent.click(screen.getByRole('button', { name: 'Ir a la foto 3' }))
    expect(visibleSlide()).toBe(3)
    expect(screen.getByRole('button', { name: 'Ir a la foto 3' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('button', { name: 'Ir a la foto 1' })).not.toHaveAttribute('aria-current')
  })

  it('supports the keyboard arrows', async () => {
    render(<PhotoCarousel />)
    screen.getByRole('button', { name: 'Foto siguiente' }).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(visibleSlide()).toBe(2)
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(visibleSlide()).toBe(3)
  })

  it('renders real photos and hides controls for a single one', () => {
    render(<PhotoCarousel photos={[{ src: '/a.jpg', alt: 'Fachada' }]} />)
    expect(screen.getByAltText('Fachada')).toHaveAttribute('src', '/a.jpg')
    expect(slides()).toHaveLength(1)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('uses real photos in thumbnails too', () => {
    render(
      <PhotoCarousel
        photos={[
          { src: '/a.jpg', alt: 'Uno' },
          { src: '/b.jpg', alt: 'Dos' },
        ]}
      />,
    )
    const thumb = screen.getByRole('button', { name: 'Ir a la foto 2' })
    expect(within(thumb).getByRole('presentation', { hidden: true })).toHaveAttribute('src', '/b.jpg')
  })
})
