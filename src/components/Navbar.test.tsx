import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import Navbar from './Navbar'

describe('Navbar', () => {
  it('marks the current route', () => {
    render(<Navbar current="proyectos" />)
    expect(screen.getByRole('link', { name: 'Proyectos' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Mapa' })).not.toHaveAttribute('aria-current')
  })

  it('toggles the mobile menu and closes with Escape', async () => {
    render(<Navbar current="mapa" />)
    const toggle = screen.getByRole('button', { name: 'Abrir menú' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(toggle)
    expect(screen.getByRole('button', { name: 'Cerrar menú' })).toHaveAttribute('aria-expanded', 'true')
    await userEvent.keyboard('{Escape}')
    expect(screen.getByRole('button', { name: 'Abrir menú' })).toHaveAttribute('aria-expanded', 'false')
  })
})
