import { format, formatDistanceToNowStrict } from 'date-fns'
import { stripHtml } from './sanitize'

export function formatDate(value: string | Date, pattern = 'MMM d, yyyy'): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return format(date, pattern)
}

export function formatRelativeDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return formatDistanceToNowStrict(date, { addSuffix: true })
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0'
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export function readingTime(html: string): number {
  const text = stripHtml(html).replace(/\s+/g, ' ').trim()
  if (!text) return 1
  return Math.max(1, Math.ceil(text.split(' ').length / 200))
}

export function truncate(value: string, max = 160): string {
  const text = value.trim()
  if (text.length <= max) return text
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    if (error.message === 'LOGIN_REQUIRED') return 'Please sign in to continue.'
    return error.message
  }
  return 'Something went wrong. Please try again.'
}
