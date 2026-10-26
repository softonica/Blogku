import { describe, expect, it } from 'vitest'
import type { Post, User } from '@/api/types'
import { buildTimeline, TIMELINE_PALETTE } from './admin-timeline'

const author: User = {
  id: 'user_author',
  username: 'author',
  name: 'Author Name',
  email: 'author@example.com',
  avatar: '',
  bio: '',
  role: 'penulis',
}

function makePost(id: string, createdAt: string, overrides: Partial<Post> = {}): Post {
  return {
    id,
    slug: id,
    title: `Story ${id}`,
    excerpt: '',
    content: '',
    cover: '',
    status: 'published',
    createdAt,
    updatedAt: createdAt,
    author,
    categories: [],
    tags: [],
    likeCount: 0,
    viewCount: 0,
    commentCount: 0,
    readingTime: 1,
    featured: false,
    ...overrides,
  }
}

describe('buildTimeline', () => {
  const reference = new Date('2026-10-18T12:00:00')

  it('builds a seven day window ending on the reference date', () => {
    const timeline = buildTimeline([], { reference })

    expect(timeline.days).toHaveLength(7)
    expect(timeline.days[0].key).toBe('2026-10-12')
    expect(timeline.days[6].key).toBe('2026-10-18')
    expect(timeline.days[0].weekday).toBe('Mon')
    expect(timeline.days[6].weekday).toBe('Sun')
    expect(timeline.label).toBe('Oct 12 – Oct 18, 2026')
    expect(timeline.startHour).toBe(8)
    expect(timeline.endHour).toBe(20)
  })

  it('places an event in the matching day column with its time and palette color', () => {
    const timeline = buildTimeline([makePost('a', '2026-10-14T08:15:00')], { reference })

    expect(timeline.events).toHaveLength(1)
    const event = timeline.events[0]
    expect(event.dayKey).toBe('2026-10-14')
    expect(event.time).toBe('08:15')
    expect(event.top).toBeCloseTo(2.08, 1)
    expect(event.color).toBe(TIMELINE_PALETTE[0])
  })

  it('cycles the palette for multiple events', () => {
    const timeline = buildTimeline(
      [
        makePost('a', '2026-10-14T09:00:00'),
        makePost('b', '2026-10-15T09:00:00'),
        makePost('c', '2026-10-16T09:00:00'),
        makePost('d', '2026-10-17T09:00:00'),
        makePost('e', '2026-10-18T09:00:00'),
        makePost('f', '2026-10-13T09:00:00'),
        makePost('g', '2026-10-12T09:00:00'),
        makePost('h', '2026-10-14T10:00:00'),
      ],
      { reference },
    )

    expect(timeline.events).toHaveLength(8)
    expect(timeline.events[6].color).toBe(TIMELINE_PALETTE[0])
    expect(timeline.events[7].color).toBe(TIMELINE_PALETTE[1])
  })

  it('clamps events that fall outside the visible time range', () => {
    const timeline = buildTimeline(
      [
        makePost('early', '2026-10-14T05:30:00'),
        makePost('late', '2026-10-15T23:45:00'),
      ],
      { reference },
    )

    expect(timeline.events[0].top).toBe(0)
    expect(timeline.events[1].top).toBe(82)
  })

  it('ignores events outside the seven day window', () => {
    const timeline = buildTimeline(
      [
        makePost('old', '2026-10-01T10:00:00'),
        makePost('inside', '2026-10-18T10:00:00'),
      ],
      { reference },
    )

    expect(timeline.events).toHaveLength(1)
    expect(timeline.events[0].id).toBe('inside')
  })

  it('uses the newest post date when no reference is provided', () => {
    const timeline = buildTimeline([
      makePost('newest', '2026-10-20T10:00:00'),
      makePost('older', '2026-10-10T10:00:00'),
    ])

    expect(timeline.days[6].key).toBe('2026-10-20')
    expect(timeline.events).toHaveLength(1)
    expect(timeline.events[0].id).toBe('newest')
  })
})
