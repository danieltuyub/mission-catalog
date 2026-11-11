import { render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./components/MapView', () => ({ default: () => <div>map</div> }))

afterEach(() => {
  window.location.hash = ''
})

describe('App', () => {
  it('shows the map by default with navbar and footer', () => {
    render(<App />)
    expect(screen.getByRole('main')).toHaveTextContent('map')
    expect(within(screen.getByRole('navigation', { name: 'Principal' })).getByRole('link', { name: 'Mapa' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Contáctanos' })).toHaveAttribute('href', '#/contacto')
  })

  it('shows the contact page for #/contacto', () => {
    window.location.hash = '#/contacto'
    render(<App />)
    expect(screen.getByRole('main')).toHaveTextContent('Contacto')
    expect(within(screen.getByRole('navigation', { name: 'Principal' })).getByRole('link', { name: 'Contacto' })).toHaveAttribute('aria-current', 'page')
  })
})
