import { beforeEach, describe, expect, it, vi } from 'vitest'

const sb = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  eq: vi.fn(),
}))

vi.mock('./supabaseClient', () => ({
  supabase: {
    from: (table: string) => ({
      select: (cols: string) => sb.select(table, cols),
      insert: (row: unknown) => sb.insert(table, row),
      delete: () => ({ eq: (col: string, value: string) => sb.eq(table, col, value) }),
    }),
  },
}))

// setup.ts mocks the module globally; these tests need the real one.
const { listSavedProjectIds, saveProject, unsaveProject } = await vi.importActual<
  typeof import('./savedProjects')
>('./savedProjects')

beforeEach(() => {
  sb.select.mockReset()
  sb.insert.mockReset()
  sb.eq.mockReset()
})

describe('listSavedProjectIds', () => {
  it('returns the project ids', async () => {
    sb.select.mockResolvedValue({ data: [{ project_id: 'a' }, { project_id: 'b' }], error: null })
    await expect(listSavedProjectIds()).resolves.toEqual(['a', 'b'])
    expect(sb.select).toHaveBeenCalledWith('saved_projects', 'project_id')
  })

  it('returns an empty list without rows', async () => {
    sb.select.mockResolvedValue({ data: null, error: null })
    await expect(listSavedProjectIds()).resolves.toEqual([])
  })

  it('throws when Supabase fails', async () => {
    sb.select.mockResolvedValue({ data: null, error: { message: 'boom' } })
    await expect(listSavedProjectIds()).rejects.toThrow('boom')
  })
})

describe('saveProject', () => {
  it('inserts the project id', async () => {
    sb.insert.mockResolvedValue({ error: null })
    await saveProject('a')
    expect(sb.insert).toHaveBeenCalledWith('saved_projects', { project_id: 'a' })
  })

  it('treats an already saved project as saved', async () => {
    sb.insert.mockResolvedValue({ error: { code: '23505', message: 'duplicate' } })
    await expect(saveProject('a')).resolves.toBeUndefined()
  })

  it('throws on other errors', async () => {
    sb.insert.mockResolvedValue({ error: { code: '42501', message: 'denied' } })
    await expect(saveProject('a')).rejects.toThrow('denied')
  })
})

describe('unsaveProject', () => {
  it('deletes by project id', async () => {
    sb.eq.mockResolvedValue({ error: null })
    await unsaveProject('a')
    expect(sb.eq).toHaveBeenCalledWith('saved_projects', 'project_id', 'a')
  })

  it('throws when Supabase fails', async () => {
    sb.eq.mockResolvedValue({ error: { message: 'boom' } })
    await expect(unsaveProject('a')).rejects.toThrow('boom')
  })
})
