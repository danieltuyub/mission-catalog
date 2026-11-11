import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./components/MapView', () => ({ default: () => <div>map</div> }))

describe('App', () => {
  it('renders the map inside the app shell', () => {
    render(<App />)
    expect(screen.getByRole('main')).toHaveTextContent('map')
  })
})
