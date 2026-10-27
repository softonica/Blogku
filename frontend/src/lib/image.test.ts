import { describe, expect, it } from 'vitest'
import { buildSrcSet, imageUrl } from './image'
import { encodeImageVariants, parseImageVariants, stripImageVariants } from './imageVariants'

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

  it('drops embedded variant metadata', () => {
    const url = encodeImageVariants('https://x.test/full.webp', {
      thumb: 'https://x.test/thumb.webp',
    })
    expect(imageUrl(url, 400)).toBe('https://x.test/full.webp')
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

  it('builds a srcset from embedded variants', () => {
    const url = encodeImageVariants('https://x.test/api/files/media/1/full.webp', {
      thumb: 'https://x.test/api/files/media/2/thumb.webp',
      medium: 'https://x.test/api/files/media/3/medium.webp',
      fullWidth: 2048,
    })
    const srcset = buildSrcSet(url)
    expect(srcset).toBe(
      'https://x.test/api/files/media/2/thumb.webp 320w, ' +
        'https://x.test/api/files/media/3/medium.webp 1024w, ' +
        'https://x.test/api/files/media/1/full.webp 2048w',
    )
  })
})

describe('image variants codec', () => {
  it('round-trips relative URLs', () => {
    const url = encodeImageVariants('/api/files/media/1/full.webp', {
      thumb: '/api/files/media/2/thumb.webp',
      medium: '/api/files/media/3/medium.webp',
      fullWidth: 1600,
    })
    expect(parseImageVariants(url)).toEqual({
      thumb: '/api/files/media/2/thumb.webp',
      medium: '/api/files/media/3/medium.webp',
      fullWidth: 1600,
    })
    expect(stripImageVariants(url)).toBe('/api/files/media/1/full.webp')
  })

  it('ignores unsafe variant urls', () => {
    const url = 'https://x.test/full.webp#imgv1&t=javascript:alert(1)'
    expect(parseImageVariants(url)).toBeNull()
  })

  it('rejects values that could break out of a srcset candidate', () => {
    const url = 'https://x.test/full.webp#imgv1&t=%2Fok.webp%201000w%2C%2Fevil.webp'
    expect(parseImageVariants(url)).toBeNull()
  })

  it('ignores unrelated fragments', () => {
    expect(parseImageVariants('https://x.test/full.webp#section')).toBeNull()
  })
})
