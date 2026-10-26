const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&#x27;': "'",
}

function decodeEntities(value: string): string {
  return value.replace(
    /&(nbsp|amp|lt|gt|quot|apos|#39|#x27);/gi,
    (match) => ENTITIES[match.toLowerCase()] ?? match,
  )
}

function stripTags(value: string): string {
  return value.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, ' ')
}

function clean(value: string): string {
  return decodeEntities(stripTags(value)).replace(/\s+/g, ' ').trim()
}

function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text
  const slice = text.slice(0, max)
  const lastSpace = slice.lastIndexOf(' ')
  const cut = lastSpace > 0 ? slice.slice(0, lastSpace) : slice
  return `${cut.replace(/[\s.,;:!?-]+$/, '')}…`
}

/**
 * Builds a short excerpt from the first non-empty paragraph of an HTML body.
 * Falls back to the first plain-text block when the content has no <p>.
 * Returns '' when there is no usable text.
 */
export function firstParagraphExcerpt(html: string, max = 300): string {
  if (!html) return ''

  const paragraphs = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
  if (paragraphs.length > 0) {
    for (const match of paragraphs) {
      const text = clean(match[1])
      if (text) return truncateAtWord(text, max)
    }
    return ''
  }

  return truncateAtWord(clean(html), max)
}
