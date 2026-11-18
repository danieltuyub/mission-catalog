import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Collapsible from './Collapsible'

afterEach(() => vi.useRealTimers())

describe('Collapsible', () => {
  it('renders nothing while closed', () => {
    render(<Collapsible open={false}>contenido</Collapsible>)
    expect(screen.queryByText('contenido')).not.toBeInTheDocument()
  })

  it('mounts collapsed, then expands', async () => {
    const { container } = render(<Collapsible open>contenido</Collapsible>)
    const wrapper = container.firstElementChild as HTMLElement
    expect(screen.getByText('contenido')).toBeInTheDocument()
    expect(wrapper.className).toContain('grid-rows-[0fr]')
    await waitFor(() => expect(wrapper.className).toContain('grid-rows-[1fr]'))
  })

  it('collapses, blocks interaction while it leaves, and unmounts afterwards', async () => {
    vi.useFakeTimers()
    const { rerender, container } = render(<Collapsible open>contenido</Collapsible>)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })
    rerender(<Collapsible open={false}>contenido</Collapsible>)
    expect(screen.getByText('contenido')).toBeInTheDocument()
    expect(screen.getByText('contenido')).toHaveAttribute('inert')
    expect((container.firstElementChild as HTMLElement).className).toContain('grid-rows-[0fr]')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })
    expect(screen.queryByText('contenido')).not.toBeInTheDocument()
  })

  it('starts fresh when it opens again', async () => {
    vi.useFakeTimers()
    const Counter = () => <input defaultValue="" aria-label="campo" />
    const { rerender } = render(<Collapsible open><Counter /></Collapsible>)
    rerender(<Collapsible open={false}><Counter /></Collapsible>)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })
    expect(screen.queryByLabelText('campo')).not.toBeInTheDocument()
    rerender(<Collapsible open><Counter /></Collapsible>)
    expect(screen.getByLabelText('campo')).toBeInTheDocument()
  })
})
