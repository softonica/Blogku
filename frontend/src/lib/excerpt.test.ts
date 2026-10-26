import { describe, it, expect } from 'vitest'
import { firstParagraphExcerpt } from './excerpt'

describe('firstParagraphExcerpt', () => {
  it('returns the first paragraph text', () => {
    expect(firstParagraphExcerpt('<p>Hello world</p>')).toBe('Hello world')
  })

  it('ignores later paragraphs', () => {
    expect(firstParagraphExcerpt('<p>First.</p><p>Second.</p>')).toBe('First.')
  })

  it('skips an empty leading paragraph', () => {
    expect(firstParagraphExcerpt('<p><br></p><p>Real text</p>')).toBe('Real text')
  })

  it('strips inline tags and decodes entities', () => {
    expect(
      firstParagraphExcerpt('<p>Tom &amp; <strong>Jerry</strong>&nbsp;!</p>'),
    ).toBe('Tom & Jerry !')
  })

  it('collapses whitespace and newlines', () => {
    expect(firstParagraphExcerpt('<p>  Hello\n   world  </p>')).toBe('Hello world')
  })

  it('falls back to plain text when there is no paragraph', () => {
    expect(firstParagraphExcerpt('<div>Just <em>text</em></div>')).toBe('Just text')
  })

  it('returns empty string for empty or tag-only content', () => {
    expect(firstParagraphExcerpt('')).toBe('')
    expect(firstParagraphExcerpt('<p><br></p><p> </p>')).toBe('')
  })

  it('truncates long text at a word boundary with an ellipsis', () => {
    const html = `<p>${'lorem '.repeat(80)}</p>`
    const out = firstParagraphExcerpt(html, 50)

    expect(out).toBe('lorem lorem lorem lorem lorem lorem lorem lorem…')
    expect(out.length).toBeLessThanOrEqual(50)
  })
})
