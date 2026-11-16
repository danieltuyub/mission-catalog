import { describe, expect, it } from 'vitest'
import { loginToastAction, loginUrl, readNext } from './authRedirect'

describe('loginUrl', () => {
  it('encodes the return path', () => {
    expect(loginUrl('/proyectos/nuevo')).toBe('#/login?next=%2Fproyectos%2Fnuevo')
  })
})

describe('readNext', () => {
  it('reads a safe in-app path', () => {
    expect(readNext('#/login?next=%2Fproyectos%2Fnuevo')).toBe('/proyectos/nuevo')
  })

  it.each([
    '#/login',
    '#/login?next=',
    '#/login?next=https%3A%2F%2Fevil.com',
    '#/login?next=%2F%2Fevil.com',
    '#/login?next=%2F%5Cevil.com',
    '#/login?next=javascript%3Aalert(1)',
  ])('falls back to Proyectos for %s', (hash) => {
    expect(readNext(hash)).toBe('/proyectos')
  })
})

describe('loginToastAction', () => {
  it('goes to the login and comes back to the current page', () => {
    window.location.hash = '#/proyectos/abc'
    const action = loginToastAction()
    expect(action.label).toBe('Iniciar sesión')
    action.onClick()
    expect(window.location.hash).toBe('#/login?next=%2Fproyectos%2Fabc')
    window.location.hash = ''
  })
})
