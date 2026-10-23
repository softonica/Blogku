import { describe, expect, it } from 'vitest'
import {
  formatDate,
  formatNumber,
  initials,
  readingTime,
  slugify,
  truncate,
} from './format'

describe('formatNumber', () => {
  it('formats compact numbers', () => {
    expect(formatNumber(1000)).toMatch(/^1K$/)
    expect(formatNumber(12400)).toMatch(/^12\.4K$/)
    expect(formatNumber(0)).toBe('0')
  })
})

describe('formatDate', () => {
  it('formats ISO dates', () => {
    expect(formatDate('2026-10-18T08:15:00.000Z')).toBe('Oct 18, 2026')
  })

  it('returns an empty string for invalid dates', () => {
    expect(formatDate('not-a-date')).toBe('')
  })
})

describe('readingTime', () => {
  it('counts 200 words per minute with a minimum of one', () => {
    expect(readingTime('<p>short</p>')).toBe(1)
    const words = Array.from({ length: 450 }, () => 'word').join(' ')
    expect(readingTime(`<p>${words}</p>`)).toBe(3)
  })
})

describe('truncate', () => {
  it('shortens long text with an ellipsis', () => {
    expect(truncate('abcdefghij', 5)).toBe('abcd…')
    expect(truncate('short', 10)).toBe('short')
  })
})

describe('initials', () => {
  it('builds initials from names', () => {
    expect(initials('Maya Chen')).toBe('MC')
    expect(initials('demo')).toBe('DE')
    expect(initials('')).toBe('?')
  })
})

describe('slugify', () => {
  it('creates url safe slugs', () => {
    expect(slugify('Héllo Wörld!')).toBe('hello-world')
    expect(slugify('  Vue 3 + PocketBase  ')).toBe('vue-3-pocketbase')
  })
})
