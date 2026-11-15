import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EMPTY_FILTERS, type FilterOptions } from '../services/projectService'
import ProjectFilters from './ProjectFilters'

const options: FilterOptions = {
  country: ['Argentina', 'México'],
  region: ['Norte'],
  responsible: ['Ana', 'Luis'],
}

const setup = (over: Partial<Parameters<typeof ProjectFilters>[0]> = {}) => {
  const onChange = vi.fn()
  const onClear = vi.fn()
  render(
    <ProjectFilters
      filters={EMPTY_FILTERS}
      options={options}
      optionsLoading={false}
      optionsError={null}
      onChange={onChange}
      onClear={onClear}
      {...over}
    />,
  )
  return { onChange, onClear }
}

describe('ProjectFilters', () => {
  describe('"Solo míos"', () => {
    it('is only offered when asked for', () => {
      setup()
      expect(screen.queryByRole('checkbox', { name: 'Solo míos' })).not.toBeInTheDocument()
    })

    it('toggles', async () => {
      const { onChange } = setup({ showMine: true })
      await userEvent.click(screen.getByRole('checkbox', { name: 'Solo míos' }))
      expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY_FILTERS, mine: true })
    })

    it('is checked and counted as an active filter when on', () => {
      setup({ showMine: true, filters: { ...EMPTY_FILTERS, mine: true } })
      expect(screen.getByRole('checkbox', { name: 'Solo míos' })).toBeChecked()
      expect(screen.getByLabelText('1 filtros activos')).toBeInTheDocument()
    })
  })

  it('has a title and the four groups', () => {
    setup()
    expect(screen.getByRole('heading', { name: 'Filtros' })).toBeInTheDocument()
    for (const name of ['Estado', 'País', 'Región', 'Encargado']) {
      expect(screen.getByRole('group', { name })).toBeInTheDocument()
    }
  })

  it('lists the three statuses and the given options', () => {
    setup()
    const status = screen.getByRole('group', { name: 'Estado' })
    expect(within(status).getAllByRole('checkbox').map((c) => c.closest('label')?.textContent)).toEqual([
      'Abierto',
      'Pausado',
      'Cerrado',
    ])
    const country = screen.getByRole('group', { name: 'País' })
    expect(within(country).getAllByRole('checkbox')).toHaveLength(2)
  })

  it('adds and removes values, allowing several per group', async () => {
    const { onChange } = setup({ filters: { ...EMPTY_FILTERS, status: ['open'] } })
    await userEvent.click(screen.getByRole('checkbox', { name: 'Pausado' }))
    expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY_FILTERS, status: ['open', 'paused'] })
    await userEvent.click(screen.getByRole('checkbox', { name: 'Abierto' }))
    expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY_FILTERS, status: [] })
    await userEvent.click(screen.getByRole('checkbox', { name: 'México' }))
    expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY_FILTERS, status: ['open'], country: ['México'] })
  })

  it('shows the active count and enables clear only when there are filters', async () => {
    const { onClear } = setup({ filters: { ...EMPTY_FILTERS, status: ['open'], country: ['México'] } })
    expect(screen.getByLabelText('2 filtros activos')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar' }))
    expect(onClear).toHaveBeenCalled()
  })

  it('disables clear without active filters', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Limpiar' })).toBeDisabled()
  })

  it('shows loading, error and empty notes', () => {
    const { unmount } = render(
      <ProjectFilters
        filters={EMPTY_FILTERS}
        options={null}
        optionsLoading
        optionsError={null}
        onChange={() => {}}
        onClear={() => {}}
      />,
    )
    expect(screen.getAllByText('Cargando…')).toHaveLength(3)
    unmount()
    setup({ options: { country: [], region: [], responsible: [] } })
    expect(screen.getAllByText('Sin opciones')).toHaveLength(3)
  })

  describe('long lists', () => {
    const seven = Array.from({ length: 7 }, (_, i) => `Lugar ${i + 1}`)
    const country = () => screen.getByRole('group', { name: 'País' })
    const names = () => within(country()).getAllByRole('checkbox').map((c) => c.closest('label')?.textContent)

    it('shows 5 options and a "Ver 2 más" button that expands and collapses', async () => {
      setup({ options: { ...options, country: seven } })
      expect(names()).toEqual(seven.slice(0, 5))
      const more = within(country()).getByRole('button', { name: 'Ver 2 más' })
      expect(more).toHaveAttribute('aria-expanded', 'false')
      await userEvent.click(more)
      expect(names()).toEqual(seven)
      await userEvent.click(within(country()).getByRole('button', { name: 'Ver menos' }))
      expect(names()).toEqual(seven.slice(0, 5))
    })

    it('has no button with 5 options or fewer', () => {
      setup({ options: { ...options, country: seven.slice(0, 5) } })
      expect(within(country()).queryByRole('button')).not.toBeInTheDocument()
    })

    it('keeps selected options visible while collapsed', () => {
      setup({ options: { ...options, country: seven }, filters: { ...EMPTY_FILTERS, country: ['Lugar 7'] } })
      expect(names()).toEqual([...seven.slice(0, 5), 'Lugar 7'])
      expect(within(country()).getByRole('button', { name: 'Ver 1 más' })).toBeInTheDocument()
    })
  })

  it('adds a search box for long lists and filters ignoring accents', async () => {
    const many = Array.from({ length: 9 }, (_, i) => `Lugar ${i}`)
    setup({ options: { country: [...many, 'Perú'], region: [], responsible: [] } })
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar en País' }), 'peru')
    const country = screen.getByRole('group', { name: 'País' })
    expect(within(country).getAllByRole('checkbox')).toHaveLength(1)
    expect(within(country).getByRole('checkbox', { name: 'Perú' })).toBeInTheDocument()
  })

  it('does not show search for short lists', () => {
    setup()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })
})
