import { describe, expect, it } from 'vitest'
import {
  sanitizeEmail,
  sanitizeHtml,
  sanitizePlainText,
  sanitizeUrl,
  stripHtml,
} from './sanitize'

describe('sanitizeHtml', () => {
  it('removes script tags and their content', () => {
    const result = sanitizeHtml('<p>Hello</p><script>alert(1)</script>')
    expect(result).toContain('<p>Hello</p>')
    expect(result).not.toContain('script')
    expect(result).not.toContain('alert')
  })

  it('removes event handler attributes', () => {
    const result = sanitizeHtml('<img src="https://example.com/a.jpg" onerror="alert(1)" />')
    expect(result).toContain('src="https://example.com/a.jpg"')
    expect(result).not.toContain('onerror')
    expect(result).not.toContain('alert')
  })

  it('blocks javascript: urls', () => {
    const result = sanitizeHtml('<a href="javascript:alert(1)">click</a>')
    expect(result).not.toContain('javascript:')
  })

  it('keeps allowlisted formatting tags', () => {
    const html =
      '<h2>Title</h2><p><strong>bold</strong> <em>italic</em></p><ul><li>one</li></ul><blockquote><p>quote</p></blockquote><pre><code>code</code></pre>'
    const result = sanitizeHtml(html)
    expect(result).toContain('<h2>Title</h2>')
    expect(result).toContain('<strong>bold</strong>')
    expect(result).toContain('<em>italic</em>')
    expect(result).toContain('<ul><li>one</li></ul>')
    expect(result).toContain('<blockquote><p>quote</p></blockquote>')
    expect(result).toContain('<pre><code>code</code></pre>')
  })

  it('hardens links with rel and target attributes', () => {
    const result = sanitizeHtml('<a href="https://example.com">example</a>')
    expect(result).toContain('target="_blank"')
    expect(result).toContain('rel="noopener noreferrer nofollow"')
  })

  it('strips iframes and style attributes', () => {
    const result = sanitizeHtml(
      '<iframe src="https://evil.example"></iframe><p style="color:red">text</p>',
    )
    expect(result).not.toContain('iframe')
    expect(result).not.toContain('style=')
    expect(result).toContain('text')
  })

  it('adds lazy loading to images', () => {
    const result = sanitizeHtml('<img src="https://example.com/a.jpg" alt="a" />')
    expect(result).toContain('loading="lazy"')
    expect(result).toContain('decoding="async"')
  })

  it('returns an empty string for empty input', () => {
    expect(sanitizeHtml('')).toBe('')
    expect(sanitizeHtml(null)).toBe('')
  })
})

describe('sanitizePlainText', () => {
  it('strips all HTML tags and leaves clean text', () => {
    expect(sanitizePlainText('<b>Bold</b> <script>alert(1)</script>')).toBe('Bold')
    expect(sanitizePlainText('<img src="x" onerror="alert(1)">Hello')).toBe('Hello')
  })

  it('handles empty or null values', () => {
    expect(sanitizePlainText('')).toBe('')
    expect(sanitizePlainText(null)).toBe('')
    expect(sanitizePlainText('   ')).toBe('')
  })

  it('trims whitespace and preserves clean punctuation', () => {
    expect(sanitizePlainText('   My Story Title!   ')).toBe('My Story Title!')
  })
})

describe('sanitizeUrl', () => {
  it('allows valid http and https urls', () => {
    expect(sanitizeUrl('https://example.com/image.jpg')).toBe('https://example.com/image.jpg')
    expect(sanitizeUrl('http://example.com/audio.mp3')).toBe('http://example.com/audio.mp3')
  })

  it('allows safe relative urls', () => {
    expect(sanitizeUrl('/avatars/1.jpg')).toBe('/avatars/1.jpg')
  })

  it('blocks javascript: and vbscript: protocols', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('')
    expect(sanitizeUrl('vbscript:msgbox(1)')).toBe('')
  })

  it('blocks protocol-relative urls that could redirect maliciously', () => {
    expect(sanitizeUrl('//evil.com/payload')).toBe('')
  })

  it('handles empty or invalid inputs', () => {
    expect(sanitizeUrl('')).toBe('')
    expect(sanitizeUrl(null)).toBe('')
    expect(sanitizeUrl('not a url')).toBe('')
  })
})

describe('sanitizeEmail', () => {
  it('cleans and normalizes email strings', () => {
    expect(sanitizeEmail('  USER@Example.COM  ')).toBe('user@example.com')
    expect(sanitizeEmail('')).toBe('')
    expect(sanitizeEmail(null)).toBe('')
  })
})

describe('stripHtml', () => {
  it('removes markup and keeps text', () => {
    expect(stripHtml('<p>Hello <strong>world</strong></p>')).toContain('Hello')
    expect(stripHtml('<p>Hello</p>')).not.toContain('<p>')
  })
})
