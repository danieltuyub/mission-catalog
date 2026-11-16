import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { projectShareUrl, shareProject } from './shareProject'

const share = vi.fn()
const writeText = vi.fn()

beforeEach(() => {
  share.mockReset().mockResolvedValue(undefined)
  writeText.mockReset().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'share', { value: share, configurable: true, writable: true })
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  window.location.hash = '#/proyectos/abc?from=guardados'
})
afterEach(() => {
  Reflect.deleteProperty(navigator, 'share')
  window.location.hash = ''
})

describe('projectShareUrl', () => {
  it('is the project address without the visitor’s navigation', () => {
    expect(projectShareUrl('abc')).toBe(`${window.location.origin}${window.location.pathname}#/proyectos/abc`)
  })
})

describe('shareProject', () => {
  it('opens the system share sheet when there is one', async () => {
    await expect(shareProject('abc', 'Casa Azul')).resolves.toBe('shared')
    expect(share).toHaveBeenCalledWith({ title: 'Casa Azul', url: projectShareUrl('abc') })
    expect(writeText).not.toHaveBeenCalled()
  })

  it('does not treat closing the sheet as a failure, and copies nothing', async () => {
    share.mockRejectedValue(new DOMException('closed', 'AbortError'))
    await expect(shareProject('abc', 'Casa Azul')).resolves.toBe('cancelled')
    expect(writeText).not.toHaveBeenCalled()
  })

  it('copies the link when the sheet fails for another reason', async () => {
    share.mockRejectedValue(new DOMException('nope', 'NotAllowedError'))
    await expect(shareProject('abc', 'Casa Azul')).resolves.toBe('copied')
    expect(writeText).toHaveBeenCalledWith(projectShareUrl('abc'))
  })

  it('copies the link where there is no share sheet', async () => {
    Reflect.deleteProperty(navigator, 'share')
    await expect(shareProject('abc', 'Casa Azul')).resolves.toBe('copied')
    expect(writeText).toHaveBeenCalledWith(projectShareUrl('abc'))
  })

  it('reports a failure when it cannot copy either', async () => {
    Reflect.deleteProperty(navigator, 'share')
    writeText.mockRejectedValue(new Error('denied'))
    await expect(shareProject('abc', 'Casa Azul')).resolves.toBe('failed')
  })
})
