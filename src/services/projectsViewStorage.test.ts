import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearOpenedFromList,
  clearProjectsView,
  clearScroll,
  loadFilters,
  loadOpenedFromList,
  loadPage,
  loadPageSize,
  loadScroll,
  loadSort,
  markOpenedFromList,
  resetListContext,
  saveFilters,
  savePage,
  savePageSize,
  saveSort,
} from './projectsViewStorage'

describe('projectsViewStorage', () => {
  beforeEach(() => clearProjectsView())

  it('starts empty', () => {
    expect(loadFilters()).toBeNull()
    expect(loadPage()).toBeNull()
    expect(loadScroll()).toBeNull()
    expect(loadOpenedFromList()).toBe(false)
  })

  it('remembers whether the detail was opened from the list, with the scroll', () => {
    markOpenedFromList(420)
    expect(loadOpenedFromList()).toBe(true)
    expect(loadScroll()).toBe(420)
    clearOpenedFromList()
    clearScroll()
    expect(loadOpenedFromList()).toBe(false)
    expect(loadScroll()).toBeNull()
  })

  it('resetListContext drops filters, page and scroll but keeps size and sort', () => {
    saveFilters({ status: ['open'], country: [], region: [], responsible: [] })
    savePage(4)
    savePageSize(6)
    saveSort('created_at')
    markOpenedFromList(100)
    resetListContext()
    expect(loadFilters()).toBeNull()
    expect(loadPage()).toBeNull()
    expect(loadScroll()).toBeNull()
    expect(loadPageSize()).toBe(6)
    expect(loadSort()).toBe('created_at')
  })
})
