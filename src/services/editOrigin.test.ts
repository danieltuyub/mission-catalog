import { describe, expect, it } from 'vitest'
import { editUrl, readEditOrigin } from './editOrigin'

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
