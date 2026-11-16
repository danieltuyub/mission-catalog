import { describe, expect, it } from 'vitest'
import { editUrl, originBack, projectUrl, readEditOrigin } from './editOrigin'

describe('editUrl', () => {
  it('adds the origin only when given', () => {
    expect(editUrl('p1')).toBe('#/proyectos/p1/editar')
    expect(editUrl('p1', 'lista')).toBe('#/proyectos/p1/editar?from=lista')
  })
})

describe('readEditOrigin', () => {
  it('reads the list origin', () => {
    expect(readEditOrigin('#/proyectos/p1/editar?from=lista')).toBe('lista')
  })

  it.each(['#/proyectos/p1/editar', '#/proyectos/p1/editar?from=', '#/proyectos/p1/editar?from=otro', '#/proyectos/p1/editar?x=lista'])(
    'ignores %s',
    (hash) => {
      expect(readEditOrigin(hash)).toBeNull()
    },
  )
})

describe('projectUrl', () => {
  it('adds the origin only when given', () => {
    expect(projectUrl('p1')).toBe('#/proyectos/p1')
    expect(projectUrl('p1', 'guardados')).toBe('#/proyectos/p1?from=guardados')
  })
})

describe('account origins', () => {
  it.each(['creados', 'guardados'] as const)('reads %s and leads back to that list in Mi espacio', (origin) => {
    expect(readEditOrigin(`#/proyectos/p1?from=${origin}`)).toBe(origin)
    expect(originBack(origin).href).toBe(`#/cuenta/proyectos/${origin}`)
  })

  it('leads back to the public list by default', () => {
    expect(originBack('lista')).toEqual({ href: '#/proyectos', label: 'Proyectos' })
  })
})

describe('admin origin', () => {
  it('leads back to the admin projects and is read from the url', () => {
    expect(originBack('admin')).toEqual({ href: '#/admin/proyectos', label: 'Administración' })
    expect(readEditOrigin('#/proyectos/p1?from=admin')).toBe('admin')
    expect(editUrl('p1', 'admin')).toBe('#/proyectos/p1/editar?from=admin')
  })
})
