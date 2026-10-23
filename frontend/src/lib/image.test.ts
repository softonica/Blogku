import { describe, expect, it } from 'vitest'
import { buildSrcSet, imageUrl } from './image'

describe('imageUrl', () => {
  it('replaces the width parameter when present', () => {
    expect(
      imageUrl(
        'https://images.pexels.com/photos/1/a.jpeg?auto=compress&w=1200',
        400,
      ),
    ).toContain('w=400')
  })

  it('returns the original url when it cannot be resized', () => {
    expect(imageUrl('/avatars/1.jpg', 400)).toBe('/avatars/1.jpg')
  })
})

describe('buildSrcSet', () => {
  it('builds a srcset for resizable images', () => {
    const srcset = buildSrcSet(
      'https://images.pexels.com/photos/1/a.jpeg?auto=compress&w=1200',
    )
    expect(srcset).toContain('400w')
    expect(srcset).toContain('800w')
    expect(srcset).toContain('1200w')
  })

  it('returns undefined for non resizable images', () => {
    expect(buildSrcSet('/avatars/1.jpg')).toBeUndefined()
  })
})
