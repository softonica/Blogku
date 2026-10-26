import { addDays, format } from 'date-fns'
import type { Post, User } from '@/api/types'

export interface TimelineDay {
  key: string
  weekday: string
  dateLabel: string
  date: Date
}

export interface TimelineEvent {
  id: string
  title: string
  slug: string
  author: User
  time: string
  dayKey: string
  top: number
  color: string
}

export interface Timeline {
  days: TimelineDay[]
  events: TimelineEvent[]
  label: string
  startHour: number
  endHour: number
}

export interface TimelineOptions {
  reference?: Date
  startHour?: number
  endHour?: number
}

export const TIMELINE_PALETTE = [
  'bg-violet-500',
  'bg-sky-500',
  'bg-amber-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500',
]

export function buildTimeline(source: Post[], options: TimelineOptions = {}): Timeline {
  const startHour = options.startHour ?? 8
  const endHour = options.endHour ?? 20
  const span = Math.max(1, endHour - startHour)

  const latest = source.reduce((max, post) => {
    const time = new Date(post.createdAt).getTime()
    return Number.isNaN(time) ? max : Math.max(max, time)
  }, 0)

  const fallback = latest || Date.now()
  const end = new Date(options.reference ?? fallback)
  end.setHours(0, 0, 0, 0)

  const days: TimelineDay[] = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(end, index - 6)
    return {
      key: format(date, 'yyyy-MM-dd'),
      weekday: format(date, 'EEE'),
      dateLabel: format(date, 'dd.MM.yyyy'),
      date,
    }
  })

  const validKeys = new Set(days.map((day) => day.key))
  const events: TimelineEvent[] = []

  source.forEach((post, index) => {
    const created = new Date(post.createdAt)
    if (Number.isNaN(created.getTime())) return

    const dayKey = format(created, 'yyyy-MM-dd')
    if (!validKeys.has(dayKey)) return

    const hour = created.getHours() + created.getMinutes() / 60
    const clamped = Math.min(Math.max(hour, startHour), endHour - 1)
    const rawTop = ((clamped - startHour) / span) * 100

    events.push({
      id: post.id,
      title: post.title,
      slug: post.slug,
      author: post.author,
      time: format(created, 'HH:mm'),
      dayKey,
      top: Math.min(rawTop, 82),
      color: TIMELINE_PALETTE[index % TIMELINE_PALETTE.length],
    })
  })

  return {
    days,
    events,
    label: `${format(days[0].date, 'MMM d')} – ${format(days[6].date, 'MMM d, yyyy')}`,
    startHour,
    endHour,
  }
}
