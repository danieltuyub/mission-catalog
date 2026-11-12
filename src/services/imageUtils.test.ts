import { describe, expect, it } from 'vitest'
import { MAX_IMAGE_BYTES, validateImage } from './imageUtils'

describe('validateImage', () => {
  it('accepts images', () => {
    expect(validateImage(new File(['x'], 'a.png', { type: 'image/png' }))).toBeNull()
  })
  it('rejects other types', () => {
    expect(validateImage(new File(['x'], 'a.pdf', { type: 'application/pdf' }))).toMatch(/imagen/)
  })
  it('rejects oversized files', () => {
    const big = new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], 'a.png', { type: 'image/png' })
    expect(validateImage(big)).toMatch(/10 MB/)
  })
})
