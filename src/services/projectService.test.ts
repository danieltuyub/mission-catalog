import { beforeEach, describe, expect, it, vi } from 'vitest'

const range = vi.hoisted(() => vi.fn())

vi.mock('./supabaseClient', () => {
  const query = {
    select: vi.fn(() => query),
    order: vi.fn(() => query),
    range,
  }
  return { supabase: { from: vi.fn(() => query) } }
})

import { getProjects } from './projectService'

describe('getProjects', () => {
  beforeEach(() => {
    range.mockReset()
    range.mockResolvedValue({ data: [], error: null, count: 10 })
  })

  it('defaults to page 1 with 3 items', async () => {
    const res = await getProjects()
    expect(range).toHaveBeenCalledWith(0, 2)
    expect(res).toMatchObject({ page: 1, pageSize: 3, total: 10, totalPages: 4 })
  })

  it('computes the range for later pages', async () => {
    await getProjects(3)
    expect(range).toHaveBeenCalledWith(6, 8)
  })

  it('honors a custom page size', async () => {
    const res = await getProjects(2, 5)
    expect(range).toHaveBeenCalledWith(5, 9)
    expect(res).toMatchObject({ page: 2, pageSize: 5, totalPages: 2 })
  })

  it('clamps invalid page and size', async () => {
    await getProjects(0, 0)
    expect(range).toHaveBeenCalledWith(0, 0)
  })

  it('throws on supabase errors', async () => {
    range.mockResolvedValue({ data: null, error: new Error('boom'), count: null })
    await expect(getProjects()).rejects.toThrow('boom')
  })
})
