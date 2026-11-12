import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Pagination from './Pagination'

describe('Pagination', () => {
  it('renders nothing for a single page', () => {
    const { container } = render(<Pagination page={1} totalPages={1} onChange={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('marks the current page and calls onChange', async () => {
    const onChange = vi.fn()
    render(<Pagination page={5} totalPages={10} onChange={onChange} />)
    expect(screen.getByRole('button', { name: 'Página 5' })).toHaveAttribute('aria-current', 'page')
    await userEvent.click(screen.getByRole('button', { name: 'Página 6' }))
    expect(onChange).toHaveBeenCalledWith(6)
  })

  it('has first, previous, next and last arrows', async () => {
    const onChange = vi.fn()
    render(<Pagination page={5} totalPages={10} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Primera página' }))
    await userEvent.click(screen.getByRole('button', { name: 'Página anterior' }))
    await userEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
    await userEvent.click(screen.getByRole('button', { name: 'Última página' }))
    expect(onChange.mock.calls.map((c) => c[0])).toEqual([1, 4, 6, 10])
  })

  it('disables backward arrows on the first page', () => {
    render(<Pagination page={1} totalPages={10} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Primera página' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Última página' })).toBeEnabled()
  })

  it('disables forward arrows on the last page', () => {
    render(<Pagination page={10} totalPages={10} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Última página' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeEnabled()
  })
})
