import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  single: vi.fn(),
  insert: vi.fn(),
  eq: vi.fn(),
  del: vi.fn(),
  upload: vi.fn(),
  removeFiles: vi.fn(),
  insertImages: vi.fn(),
  updateEq: vi.fn(),
  list: vi.fn(),
  savePos: vi.fn(),
  addRows: vi.fn(),
  delRows: vi.fn(),
}))

vi.mock('./supabaseClient', () => {
  const insertChain = { select: () => ({ single: m.single }) }
  return {
    supabase: {
      from: () => ({
        insert: m.insert.mockImplementation(() => insertChain),
        delete: m.del.mockImplementation(() => ({ eq: m.eq })),
        update: () => ({ eq: m.updateEq.mockImplementation(() => ({ select: () => ({ single: m.single }) })) }),
      }),
    },
  }
})
vi.mock('./projectImages', () => ({
  uploadProjectImage: m.upload,
  removeProjectImageFiles: m.removeFiles,
  insertProjectImages: m.insertImages,
  listProjectImages: m.list,
  saveImagePositions: m.savePos,
  addProjectImageRows: m.addRows,
  deleteProjectImageRows: m.delRows,
}))

import { createProject, createProjectWithImages, updateProjectWithImages } from './projectAdmin'

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

describe('updateProjectWithImages', () => {
  const patch = { name: 'Casa' }
  beforeEach(() => {
    m.list.mockResolvedValue([
      { id: 'i1', path: 'p1/a.webp' },
      { id: 'i2', path: 'p1/b.webp' },
      { id: 'i3', path: 'p1/c.webp' },
    ])
    m.savePos.mockResolvedValue(undefined)
    m.addRows.mockResolvedValue(undefined)
    m.delRows.mockResolvedValue(undefined)
  })

  it('re-positions kept photos, adds new ones and deletes removed ones last', async () => {
    m.upload.mockResolvedValue('p1/new.webp')
    const res = await updateProjectWithImages('p1', patch, [
      { kind: 'new', file: file('n') },
      { kind: 'existing', id: 'i3', path: 'p1/c.webp' },
      { kind: 'existing', id: 'i1', path: 'p1/a.webp' },
    ])
    expect(res).toEqual(project)
    expect(m.updateEq).toHaveBeenCalledWith('id', 'p1')
    expect(m.savePos).toHaveBeenCalledWith('p1', [
      { id: 'i3', path: 'p1/c.webp', position: 1 },
      { id: 'i1', path: 'p1/a.webp', position: 2 },
    ])
    expect(m.addRows).toHaveBeenCalledWith('p1', [{ path: 'p1/new.webp', position: 0 }])
    expect(m.delRows).toHaveBeenCalledWith(['i2'])
    expect(m.removeFiles).toHaveBeenCalledWith(['p1/b.webp'])
  })

  it('does not upload when only fields change', async () => {
    await updateProjectWithImages('p1', patch, [
      { kind: 'existing', id: 'i1', path: 'p1/a.webp' },
      { kind: 'existing', id: 'i2', path: 'p1/b.webp' },
      { kind: 'existing', id: 'i3', path: 'p1/c.webp' },
    ])
    expect(m.upload).not.toHaveBeenCalled()
    expect(m.delRows).toHaveBeenCalledWith([])
  })

  it('removes the new uploads and keeps the old photos when the update fails', async () => {
    m.upload.mockResolvedValue('p1/new.webp')
    m.single.mockResolvedValue({ data: null, error: new Error('rls') })
    await expect(
      updateProjectWithImages('p1', patch, [{ kind: 'new', file: file('n') }]),
    ).rejects.toThrow('rls')
    expect(m.removeFiles).toHaveBeenCalledWith(['p1/new.webp'])
    expect(m.delRows).not.toHaveBeenCalled()
  })

  it('removes the new uploads when linking them fails', async () => {
    m.upload.mockResolvedValue('p1/new.webp')
    m.addRows.mockRejectedValue(new Error('link'))
    await expect(
      updateProjectWithImages('p1', patch, [{ kind: 'new', file: file('n') }]),
    ).rejects.toThrow('link')
    expect(m.removeFiles).toHaveBeenCalledWith(['p1/new.webp'])
    expect(m.delRows).not.toHaveBeenCalled()
  })

  it('keeps the new uploads when only deleting removed rows fails', async () => {
    m.upload.mockResolvedValue('p1/new.webp')
    m.delRows.mockRejectedValue(new Error('del'))
    await expect(
      updateProjectWithImages('p1', patch, [{ kind: 'new', file: file('n') }]),
    ).rejects.toThrow('del')
    expect(m.removeFiles).not.toHaveBeenCalled()
  })
})
