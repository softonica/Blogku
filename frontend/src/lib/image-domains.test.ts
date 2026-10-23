import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ALLOWED_IMAGE_DOMAINS,
  extractDomain,
  isAllowedImageDomain,
} from './image-domains'

describe('image-domains', () => {
  it('extracts domain correctly', () => {
    expect(extractDomain('https://images.unsplash.com/photo-123')).toBe('images.unsplash.com')
    expect(extractDomain('http://sub.domain.com:8080/path')).toBe('sub.domain.com')
    expect(extractDomain('/local/image.jpg')).toBeNull()
    expect(extractDomain('data:image/png;base64,...')).toBeNull()
    expect(extractDomain('')).toBeNull()
  })

  it('allows default trusted domains', () => {
    expect(
      isAllowedImageDomain('https://images.unsplash.com/photo-123', DEFAULT_ALLOWED_IMAGE_DOMAINS),
    ).toBe(true)
    expect(
      isAllowedImageDomain('https://images.pexels.com/photos/456', DEFAULT_ALLOWED_IMAGE_DOMAINS),
    ).toBe(true)
  })

  it('allows subdomains of allowed domains', () => {
    expect(isAllowedImageDomain('https://sub.cloudinary.com/img.jpg', ['cloudinary.com'])).toBe(
      true,
    )
  })

  it('blocks untrusted external domains', () => {
    expect(isAllowedImageDomain('https://evil.com/x.jpg', ['images.unsplash.com'])).toBe(false)
    expect(
      isAllowedImageDomain('https://malicious-site.org/tracker.png', DEFAULT_ALLOWED_IMAGE_DOMAINS),
    ).toBe(false)
  })

  it('always allows local paths and data image URLs', () => {
    expect(isAllowedImageDomain('/avatars/1.jpg', [])).toBe(true)
    expect(isAllowedImageDomain('data:image/jpeg;base64,/9j/4AAQSkZJRg...', [])).toBe(true)
  })

  it('rejects invalid or empty URLs', () => {
    expect(isAllowedImageDomain('', DEFAULT_ALLOWED_IMAGE_DOMAINS)).toBe(false)
    expect(isAllowedImageDomain('not a url', DEFAULT_ALLOWED_IMAGE_DOMAINS)).toBe(false)
    expect(isAllowedImageDomain('javascript:alert(1)', DEFAULT_ALLOWED_IMAGE_DOMAINS)).toBe(false)
  })
})
