import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { setLanguage } from '../i18n'
import { EMPTY_FILTERS } from '../services/projectService'
import ProjectFilters from './ProjectFilters'

afterEach(() => setLanguage('es'))

describe('ProjectFilters in English', () => {
  it('uses the English names, including the project statuses', async () => {
    await setLanguage('en')
    render(<ProjectFilters filters={{ ...EMPTY_FILTERS, status: ['open'] }} options={null} optionsLoading={false} optionsError={null} onChange={() => {}} onClear={() => {}} />)
    expect(screen.getByRole('heading', { name: /Filters/ })).toBeInTheDocument()
    expect(screen.getByLabelText('1 active filter')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Open' })).toBeChecked()
    expect(screen.getByText('Country')).toBeInTheDocument()
  })
})
