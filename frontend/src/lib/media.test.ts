import { describe, expect, it } from 'vitest'
import {
  formatMediaDate,
  groupMediaByMonth,
  isVariantFileName,
  mediaDisplayName,
} from './media'

describe('isVariantFileName', () => {
  it('detects generated thumb/medium variant names', () => {
    expect(isVariantFileName('cover.thumb.webp')).toBe(true)
    expect(isVariantFileName('cover.medium.webp')).toBe(true)
    expect(isVariantFileName('ncmaz-thumb-cover.webp')).toBe(true)
    expect(isVariantFileName('ncmaz_medium_cover_ab12cd34ef.webp')).toBe(true)
  })

  it('keeps regular file names', () => {
    expect(isVariantFileName('cover.webp')).toBe(false)
    expect(isVariantFileName('thumbnail_ab12cd34ef.jpg')).toBe(false)
    expect(isVariantFileName('my_thumb_nail.jpg')).toBe(false)
  })
})

describe('mediaDisplayName', () => {
  it('strips PocketBase random suffixes and separators', () => {
    expect(mediaDisplayName('my_cover_photo_ab12cd34ef.webp')).toBe('my cover photo')
    expect(mediaDisplayName('hero.webp')).toBe('hero')
  })

  it('falls back to the raw name when nothing is left', () => {
    expect(mediaDisplayName('.webp')).toBe('.webp')
  })
})

describe('groupMediaByMonth', () => {
  const items = [
    { id: 'a', createdAt: '2026-10-20T10:00:00' },
    { id: 'b', createdAt: '2026-10-02T10:00:00' },
    { id: 'c', createdAt: '2026-07-15T10:00:00' },
    { id: 'd', createdAt: '2025-12-31T10:00:00' },
    { id: 'e', createdAt: 'not-a-date' },
  ]

  it('groups by year then month, newest first', () => {
    const groups = groupMediaByMonth(items)
    expect(groups.map((group) => group.year)).toEqual([2026, 2025])
    expect(groups[0].total).toBe(3)
    expect(groups[0].months.map((month) => month.label)).toEqual([
      'October 2026',
      'July 2026',
    ])
    expect(groups[0].months[0].items.map((item) => item.id)).toEqual(['a', 'b'])
    expect(groups[1].months[0].label).toBe('December 2025')
  })

  it('skips invalid dates', () => {
    const groups = groupMediaByMonth(items)
    const ids = groups.flatMap((group) =>
      group.months.flatMap((month) => month.items.map((item) => item.id)),
    )
    expect(ids).not.toContain('e')
  })

  it('returns an empty list for empty input', () => {
    expect(groupMediaByMonth([])).toEqual([])
  })
})

describe('formatMediaDate', () => {
  it('formats a valid date', () => {
    expect(formatMediaDate('2026-10-20T10:00:00')).toContain('2026')
  })

  it('returns an empty string for invalid dates', () => {
    expect(formatMediaDate('nope')).toBe('')
  })
})
