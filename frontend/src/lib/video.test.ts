import { describe, expect, it } from 'vitest'
import { getEmbedUrl } from './video'

describe('getEmbedUrl', () => {
  it('returns null for empty or undefined url', () => {
    expect(getEmbedUrl()).toBeNull()
    expect(getEmbedUrl('')).toBeNull()
    expect(getEmbedUrl('   ')).toBeNull()
  })

  it('parses standard youtube watch url', () => {
    expect(getEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    )
  })

  it('parses youtu.be short url', () => {
    expect(getEmbedUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    )
  })

  it('parses youtube shorts url', () => {
    expect(getEmbedUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    )
  })

  it('parses vimeo url', () => {
    expect(getEmbedUrl('https://vimeo.com/76979871')).toBe(
      'https://player.vimeo.com/video/76979871',
    )
  })

  it('returns null for generic web urls', () => {
    expect(getEmbedUrl('https://example.com/video.mp4')).toBeNull()
  })
})
