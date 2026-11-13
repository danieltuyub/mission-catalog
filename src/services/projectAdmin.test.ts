import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  single: vi.fn(),
  insert: vi.fn(),
  eq: vi.fn(),
  del: vi.fn(),
  upload: vi.fn(),
  removeFiles: vi.fn(),
  insertImages: vi.fn(),
}))

vi.mock('./supabaseClient', () => {
  const insertChain = { select: () => ({ single: m.single }) }
  return {
    supabase: {
      from: () => ({
        insert: m.insert.mockImplementation(() => insertChain),
        delete: m.del.mockImplementation(() => ({ eq: m.eq })),
      }),
    },
  }
})
vi.mock('./projectImages', () => ({
  uploadProjectImage: m.upload,
  removeProjectImageFiles: m.removeFiles,
  insertProjectImages: m.insertImages,
}))

import { createProject, createProjectWithImages } from './projectAdmin'

const file = (n: string) => new File(['x'], n, { type: 'image/png' })
const project = { id: 'p1', name: 'Casa' }

beforeEach(() => {
  Object.values(m).forEach((f) => f.mockReset())
  m.single.mockResolvedValue({ data: project, error: null })
  m.eq.mockResolvedValue({ error: null })
  m.removeFiles.mockResolvedValue(undefined)
})

describe('createProject', () => {
  it('inserts and returns the row', async () => {
    await expect(createProject({ name: 'Casa' })).resolves.toEqual(project)
    expect(m.insert).toHaveBeenCalledWith({ name: 'Casa' })
  })

  it('throws on a database error', async () => {
    m.single.mockResolvedValue({ data: null, error: new Error('rls') })
    await expect(createProject({ name: 'Casa' })).rejects.toThrow('rls')
  })
})

describe('createProjectWithImages', () => {
  it('skips image work without files', async () => {
    await createProjectWithImages({ name: 'Casa' }, [])
    expect(m.upload).not.toHaveBeenCalled()
    expect(m.insertImages).not.toHaveBeenCalled()
  })

  it('uploads in order and links the paths', async () => {
    m.upload.mockResolvedValueOnce('p1/a.webp').mockResolvedValueOnce('p1/b.webp')
    const res = await createProjectWithImages({ name: 'Casa' }, [file('a'), file('b')])
    expect(res).toEqual(project)
    expect(m.upload.mock.calls.map((c) => c[1].name)).toEqual(['a', 'b'])
    expect(m.insertImages).toHaveBeenCalledWith('p1', ['p1/a.webp', 'p1/b.webp'])
    expect(m.del).not.toHaveBeenCalled()
  })

  it('rolls back files and project when an upload fails', async () => {
    m.upload.mockResolvedValueOnce('p1/a.webp').mockRejectedValueOnce(new Error('upload'))
    await expect(createProjectWithImages({ name: 'Casa' }, [file('a'), file('b')])).rejects.toThrow('upload')
    expect(m.removeFiles).toHaveBeenCalledWith(['p1/a.webp'])
    expect(m.eq).toHaveBeenCalledWith('id', 'p1')
  })

  it('rolls back when linking the images fails', async () => {
    m.upload.mockResolvedValue('p1/a.webp')
    m.insertImages.mockRejectedValue(new Error('link'))
    await expect(createProjectWithImages({ name: 'Casa' }, [file('a')])).rejects.toThrow('link')
    expect(m.removeFiles).toHaveBeenCalledWith(['p1/a.webp'])
    expect(m.eq).toHaveBeenCalledWith('id', 'p1')
  })
})
