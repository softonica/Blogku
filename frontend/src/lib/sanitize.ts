import DOMPurify from 'dompurify'

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  's',
  'del',
  'ul',
  'ol',
  'li',
  'a',
  'h2',
  'h3',
  'blockquote',
  'code',
  'pre',
  'img',
  'hr',
]

const ALLOWED_ATTR = [
  'href',
  'src',
  'alt',
  'title',
  'loading',
  'decoding',
  'class',
  'target',
  'rel',
]

let hooksInstalled = false

function installHooks(): void {
  if (hooksInstalled) return
  hooksInstalled = true
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.nodeName === 'A') {
      const href = node.getAttribute('href') || ''
      if (href.startsWith('http://') || href.startsWith('https://')) {
        node.setAttribute('rel', 'noopener noreferrer nofollow')
        node.setAttribute('target', '_blank')
      } else if (href.startsWith('mailto:') || (href.startsWith('/') && !href.startsWith('//'))) {
        // Safe internal or mailto link
      } else {
        node.removeAttribute('href')
      }
    }
    if (node.nodeName === 'IMG') {
      node.setAttribute('loading', 'lazy')
      node.setAttribute('decoding', 'async')
    }
  })
}

/**
 * Sanitizes rich HTML content with strict DOMPurify allowlist.
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return ''
  installHooks()
  return String(
    DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
      ALLOW_DATA_ATTR: false,
      FORBID_TAGS: [
        'script',
        'style',
        'iframe',
        'object',
        'embed',
        'form',
        'input',
        'button',
        'link',
        'meta',
      ],
      FORBID_ATTR: ['style', 'srcset', 'onerror', 'onload', 'onclick', 'onmouseover'],
    }),
  )
}

/**
 * Strips all HTML tags and attributes, returning completely safe plain text.
 * Prevents HTML/XSS injection into plain text form fields (title, excerpt, name, bio, comment, etc.).
 */
export function sanitizePlainText(value: string | null | undefined): string {
  if (!value) return ''
  const cleaned = DOMPurify.sanitize(value, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  })
  return String(cleaned)
    .replace(/<[^>]*>/g, '')
    .trim()
}

/**
 * Validates and sanitizes URL inputs (avatar, cover, video, audio, etc.).
 * Strictly disallows dangerous schemes like javascript:, vbscript:, data:text/html.
 */
export function sanitizeUrl(url: string | null | undefined): string {
  if (!url) return ''
  const trimmed = url.trim()
  if (!trimmed) return ''

  // Allow safe relative URLs starting with / (excluding //protocol-relative)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed
  }

  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return trimmed
    }
    return ''
  } catch {
    return ''
  }
}

/**
 * Sanitizes email addresses.
 */
export function sanitizeEmail(email: string | null | undefined): string {
  if (!email) return ''
  return email.trim().toLowerCase()
}

/**
 * Strips HTML tags for rough text calculation (e.g. word count).
 */
export function stripHtml(value: string | null | undefined): string {
  if (!value) return ''
  return String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}
