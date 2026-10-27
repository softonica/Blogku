const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export interface MediaMonthGroup<T> {
  key: string
  year: number
  month: number
  label: string
  items: T[]
}

export interface MediaYearGroup<T> {
  year: number
  label: string
  total: number
  months: MediaMonthGroup<T>[]
}

export function isVariantFileName(name: string): boolean {
  if (/^ncmaz[._-](thumb|medium)[._-]/i.test(name)) return true
  return /\.(thumb|medium)\.[a-z0-9]+$/i.test(name)
}

export function mediaDisplayName(fileName: string): string {
  const withoutExt = fileName.replace(/\.[^.]+$/, '')
  const withoutRandomSuffix = withoutExt.replace(/_[a-z0-9]{10}$/i, '')
  const readable = withoutRandomSuffix.replace(/[_-]+/g, ' ').trim()
  return readable || fileName
}

export function formatMediaDate(createdAt: string): string {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function groupMediaByMonth<T extends { createdAt: string }>(
  items: T[],
): MediaYearGroup<T>[] {
  const buckets = new Map<number, Map<number, T[]>>()

  for (const item of items) {
    const date = new Date(item.createdAt)
    if (Number.isNaN(date.getTime())) continue

    const year = date.getFullYear()
    const month = date.getMonth()
    const months = buckets.get(year) ?? new Map<number, T[]>()
    const bucket = months.get(month) ?? []
    bucket.push(item)
    months.set(month, bucket)
    buckets.set(year, months)
  }

  return [...buckets.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, months]) => {
      const monthGroups = [...months.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([month, monthItems]) => ({
          key: `${year}-${String(month + 1).padStart(2, '0')}`,
          year,
          month,
          label: `${MONTH_NAMES[month]} ${year}`,
          items: monthItems,
        }))

      return {
        year,
        label: String(year),
        total: monthGroups.reduce((sum, group) => sum + group.items.length, 0),
        months: monthGroups,
      }
    })
}
