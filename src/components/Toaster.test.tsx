import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { showToast } from '../services/toast'
import Toaster from './Toaster'

const card = () => screen.getByText(/.+/, { selector: 'span' }).parentElement as HTMLElement

describe('Toaster', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
  afterEach(() => vi.useRealTimers())

  it('renders nothing until a toast is shown, inside a polite live region', () => {
    render(<Toaster />)
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('shows the message and closes it by itself', () => {
    render(<Toaster />)
    act(() => showToast('Proyecto guardado'))
    expect(screen.getByRole('status')).toHaveTextContent('Proyecto guardado')
    expect(card()).toHaveAttribute('data-state', 'open')

    act(() => void vi.advanceTimersByTime(3900))
    expect(card()).toHaveAttribute('data-state', 'open')
    act(() => void vi.advanceTimersByTime(200))
    expect(card()).toHaveAttribute('data-state', 'closed')
  })

  it('gives a toast with a button more time', () => {
    render(<Toaster />)
    act(() => showToast('Quitado', { label: 'Deshacer', onClick: () => {} }))
    act(() => void vi.advanceTimersByTime(4500))
    expect(card()).toHaveAttribute('data-state', 'open')
    act(() => void vi.advanceTimersByTime(1600))
    expect(card()).toHaveAttribute('data-state', 'closed')
  })

  it('runs the action and closes', async () => {
    const onClick = vi.fn()
    render(<Toaster />)
    act(() => showToast('Quitado', { label: 'Deshacer', onClick }))
    await userEvent.click(screen.getByRole('button', { name: 'Deshacer' }))
    expect(onClick).toHaveBeenCalledOnce()
    expect(card()).toHaveAttribute('data-state', 'closed')
  })

  it('pauses while hovered and resumes after', async () => {
    render(<Toaster />)
    act(() => showToast('Proyecto guardado'))
    await userEvent.hover(card())
    act(() => void vi.advanceTimersByTime(10_000))
    expect(card()).toHaveAttribute('data-state', 'open')

    await userEvent.unhover(card())
    act(() => void vi.advanceTimersByTime(4100))
    expect(card()).toHaveAttribute('data-state', 'closed')
  })

  it('a new toast replaces the current one and restarts the countdown', () => {
    render(<Toaster />)
    act(() => showToast('Uno'))
    act(() => void vi.advanceTimersByTime(3000))
    act(() => showToast('Dos'))
    expect(screen.getByRole('status')).toHaveTextContent('Dos')
    act(() => void vi.advanceTimersByTime(3000))
    expect(card()).toHaveAttribute('data-state', 'open')
    act(() => void vi.advanceTimersByTime(1100))
    expect(card()).toHaveAttribute('data-state', 'closed')
  })

  it('does not carry a hover pause into the next toast', async () => {
    render(<Toaster />)
    act(() => showToast('Uno'))
    await userEvent.hover(card())
    act(() => showToast('Dos'))
    act(() => void vi.advanceTimersByTime(4100))
    expect(card()).toHaveAttribute('data-state', 'closed')
  })
})
