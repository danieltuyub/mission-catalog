import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('../services/accountService', () => ({ setPreferredLanguage: vi.fn(async () => {}) }))

import { setPreferredLanguage } from '../services/accountService'
import { getAuthSnapshot } from '../services/authService'
import { SUBSCRIBER } from '../test/auth'
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
    await userEvent.click(screen.getByRole('button', { name: 'Cambiar idioma: English' }))
    expect(await screen.findByText('Contact us')).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('en')
    expect(saved.get('lang')).toBe('en')
    expect(screen.getByRole('button', { name: 'Change language: Español' })).toBeInTheDocument()
  })

  it('also saves the choice in the profile when signed in, and only then', async () => {
    const { unmount } = render(<LanguageSwitch />)
    await userEvent.click(screen.getByRole('button', { name: 'Cambiar idioma: English' }))
    expect(setPreferredLanguage).not.toHaveBeenCalled()
    unmount()

    vi.mocked(getAuthSnapshot).mockReturnValue(SUBSCRIBER)
    render(<LanguageSwitch />)
    // The first click left the page in English: the button now offers Spanish.
    await userEvent.click(screen.getByRole('button', { name: 'Change language: Español' }))
    expect(setPreferredLanguage).toHaveBeenCalledWith('sub-1', 'es')
  })
})
