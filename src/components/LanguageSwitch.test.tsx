import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Footer from './Footer'
import LanguageSwitch from './LanguageSwitch'

describe('LanguageSwitch', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('switches the text, the document language and remembers the choice', async () => {
    // This environment's localStorage is not a real one: a small stand-in.
    const saved = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (k: string) => saved.get(k) ?? null, setItem: (k: string, v: string) => void saved.set(k, v) })
    render(
      <>
        <LanguageSwitch />
        <Footer />
      </>,
    )
    expect(screen.getByText('Contáctanos')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cambiar idioma: EN' }))
    expect(await screen.findByText('Contact us')).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('en')
    expect(saved.get('lang')).toBe('en')
    expect(screen.getByRole('button', { name: 'Change language: ES' })).toBeInTheDocument()
  })
})
