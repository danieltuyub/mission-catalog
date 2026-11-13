import { describe, expect, it } from 'vitest'
import type { Project } from '../types'
import { projectPhotos } from './projectImages'

const project = { id: '1', name: 'Casa' } as Project

describe('projectPhotos', () => {
  it('is empty without images', () => {
    expect(projectPhotos(project)).toEqual([])
    expect(projectPhotos({ ...project, project_images: [] })).toEqual([])
  })

  it('sorts by position and builds alt text', () => {
    const photos = projectPhotos({
      ...project,
      project_images: [
        { id: 'b', path: 'b.webp', position: 2, alt: null },
        { id: 'a', path: 'a.webp', position: 1, alt: 'Fachada' },
      ],
    })
    expect(photos.map((p) => p.src)).toEqual([
      expect.stringContaining('a.webp'),
      expect.stringContaining('b.webp'),
    ])
    expect(photos.map((p) => p.alt)).toEqual(['Fachada', 'Casa — foto 2'])
  })
})
