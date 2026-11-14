import { beforeEach, describe, expect, it, vi } from 'vitest'

const { range, order, inFilter, rpc, select, maybeSingle } = vi.hoisted(() => ({
  select: vi.fn(),
  maybeSingle: vi.fn(),
  range: vi.fn(),
  order: vi.fn(),
  inFilter: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('./supabaseClient', () => {
  const query = {
    select: select.mockImplementation(() => query),
    eq: vi.fn(() => ({ maybeSingle })),
    in: inFilter.mockImplementation(() => query),
    order: order.mockImplementation(() => query),
    range,
  }
  return { supabase: { from: vi.fn(() => query), rpc } }
})

import { clearFilterOptionsCache, getProjectById, getProjectFilterOptions, getProjects } from './projectService'

describe('getProjects', () => {
  beforeEach(() => {
    range.mockReset()
    order.mockClear()
    inFilter.mockClear()
    range.mockResolvedValue({ data: [], error: null, count: 10 })
  })

  it('defaults to page 1 with 4 items', async () => {
    const res = await getProjects()
    expect(range).toHaveBeenCalledWith(0, 3)
    expect(res).toMatchObject({ page: 1, pageSize: 4, total: 10, totalPages: 3 })
  })

  it('does not load the long details text in the list', async () => {
    await getProjects()
    const columns = select.mock.calls[0][0] as string
    expect(columns).not.toMatch(/(^|[ ,])\*|details|phone|mail/)
    expect(columns).toContain('created_by')
    expect(columns).toContain('project_images(')
  })

  it('computes the range for later pages', async () => {
    await getProjects({ page: 3 })
    expect(range).toHaveBeenCalledWith(8, 11)
  })

  it('honors a custom page size', async () => {
    const res = await getProjects({ page: 2, pageSize: 5 })
    expect(range).toHaveBeenCalledWith(5, 9)
    expect(res).toMatchObject({ page: 2, pageSize: 5, totalPages: 2 })
  })

  it('orders by name ascending by default, then id', async () => {
    await getProjects()
    expect(order).toHaveBeenNthCalledWith(1, 'name', { ascending: true })
    expect(order).toHaveBeenNthCalledWith(2, 'id')
  })

  it('orders by created_at newest first', async () => {
    await getProjects({ sort: 'created_at' })
    expect(order).toHaveBeenNthCalledWith(1, 'created_at', { ascending: false })
  })

  it('honors an explicit direction', async () => {
    await getProjects({ sort: 'name', direction: 'desc' })
    expect(order).toHaveBeenNthCalledWith(1, 'name', { ascending: false })
    await getProjects({ sort: 'created_at', direction: 'asc' })
    expect(order).toHaveBeenNthCalledWith(3, 'created_at', { ascending: true })
  })

  it('clamps invalid page and size', async () => {
    await getProjects({ page: 0, pageSize: 0 })
    expect(range).toHaveBeenCalledWith(0, 0)
  })

  it('does not filter without filters or with empty lists', async () => {
    await getProjects({ filters: { status: [], country: [] } })
    expect(inFilter).not.toHaveBeenCalled()
  })

  it('applies each non-empty filter with in()', async () => {
    await getProjects({
      filters: { status: ['open', 'paused'], country: ['México'], region: [], responsible: ['Ana'] },
    })
    expect(inFilter).toHaveBeenCalledTimes(3)
    expect(inFilter).toHaveBeenCalledWith('status', ['open', 'paused'])
    expect(inFilter).toHaveBeenCalledWith('country', ['México'])
    expect(inFilter).toHaveBeenCalledWith('responsible', ['Ana'])
  })

  it('throws on supabase errors', async () => {
    range.mockResolvedValue({ data: null, error: new Error('boom'), count: null })
    await expect(getProjects()).rejects.toThrow('boom')
  })
})

describe('getProjectFilterOptions', () => {
  beforeEach(() => {
    rpc.mockReset()
    clearFilterOptionsCache()
  })

  it('sorts alphabetically, accent-aware, and caches the request', async () => {
    rpc.mockResolvedValue({
      data: { country: ['México', 'Argentina', 'Zambia', 'Éire'], region: [], responsible: ['b', 'A'] },
      error: null,
    })
    const first = await getProjectFilterOptions()
    expect(first.country).toEqual(['Argentina', 'Éire', 'México', 'Zambia'])
    expect(first.responsible).toEqual(['A', 'b'])
    await getProjectFilterOptions()
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('project_filter_options')
  })

  it('tolerates missing keys', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    expect(await getProjectFilterOptions()).toEqual({ country: [], region: [], responsible: [] })
  })

  it('does not cache failures', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: new Error('boom') })
    await expect(getProjectFilterOptions()).rejects.toThrow('boom')
    rpc.mockResolvedValueOnce({ data: { country: ['X'] }, error: null })
    expect((await getProjectFilterOptions()).country).toEqual(['X'])
  })
})

describe('getProjectById', () => {
  it('loads only the summary for guests (the database withholds the rest)', async () => {
    select.mockClear()
    maybeSingle.mockResolvedValue({ data: { id: 'x' }, error: null })
    await getProjectById('00000000-0000-0000-0000-000000000001', false)
    const columns = select.mock.calls[0][0] as string
    expect(columns).not.toMatch(/(^|[ ,])\*|details|phone|mail/)
  })

  it('loads every column, including details', async () => {
    select.mockClear()
    maybeSingle.mockResolvedValue({ data: { id: 'x', details: 'texto' }, error: null })
    const project = await getProjectById('00000000-0000-0000-0000-000000000001')
    expect(select.mock.calls[0][0]).toMatch(/^\*, project_images\(/)
    expect(project?.details).toBe('texto')
  })
})
