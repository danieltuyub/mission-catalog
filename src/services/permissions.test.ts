import { describe, expect, it } from 'vitest'
import { ADMIN, CREATOR, SIGNED_OUT, SUBSCRIBER } from '../test/auth'
import { can, canEditProject } from './permissions'

describe('can', () => {
  it('guests can do nothing', () => {
    expect(can(SIGNED_OUT, 'projects.view_detail')).toBe(false)
  })

  it('checks the listed permissions', () => {
    expect(can(SUBSCRIBER, 'projects.save')).toBe(true)
    expect(can(SUBSCRIBER, 'projects.create')).toBe(false)
    expect(can(CREATOR, 'projects.create')).toBe(true)
  })

  it('admins can do anything', () => {
    expect(can(ADMIN, 'pins.write')).toBe(true)
    expect(can(ADMIN, 'made.up')).toBe(true)
  })
})

describe('canEditProject', () => {
  it('admins edit every project, owned or not', () => {
    expect(canEditProject(ADMIN, { created_by: 'x' })).toBe(true)
    expect(canEditProject(ADMIN, { created_by: null })).toBe(true)
  })

  it('creators edit only their own', () => {
    expect(canEditProject(CREATOR, { created_by: 'creator-1' })).toBe(true)
    expect(canEditProject(CREATOR, { created_by: 'other' })).toBe(false)
    expect(canEditProject(CREATOR, { created_by: null })).toBe(false)
    expect(canEditProject(CREATOR, {})).toBe(false)
  })

  it('subscribers and guests edit nothing', () => {
    expect(canEditProject(SUBSCRIBER, { created_by: 'sub-1' })).toBe(false)
    expect(canEditProject(SIGNED_OUT, { created_by: null })).toBe(false)
  })
})
