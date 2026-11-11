import { describe, expect, it } from 'vitest'
import { getPageWindow } from './pageWindow'

describe('getPageWindow', () => {
  it.each([
    [1, 0, []],
    [1, 1, [1]],
    [1, 2, [1, 2]],
    [2, 3, [1, 2, 3]],
    [1, 10, [1, 2, 3]],
    [2, 10, [1, 2, 3]],
    [5, 10, [4, 5, 6]],
    [9, 10, [8, 9, 10]],
    [10, 10, [8, 9, 10]],
  ])('page %i of %i -> %j', (page, total, expected) => {
    expect(getPageWindow(page, total)).toEqual(expected)
  })
})
