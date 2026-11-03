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
  'h4',
  'blockquote',
  'code',
  'pre',
  'img',
  'hr',
  'table',
  'caption',
  'colgroup',
  'col',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
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
  'style',
  'colspan',
  'rowspan',
  'colwidth',
  'scope',
  'align',
]

const ALLOWED_STYLE: Record<string, RegExp> = {
  'text-align': /^(left|right|center|justify|start|end)$/,
  'vertical-align': /^(top|middle|bottom|baseline)$/,
  width: /^\d+(\.\d+)?(px|%|em|rem|pt|vw|ch)$/,
  'min-width': /^\d+(\.\d+)?(px|%|em|rem|pt|vw|ch)$/,
  'max-width': /^\d+(\.\d+)?(px|%|em|rem|pt|vw|ch)$/,
}

/**
 * Keeps only the safe CSS declarations we rely on for editor layout
 * (table sizing and text alignment). Everything else is dropped.
 */
function filterStyleAttribute(style: string): string {
  const safe: string[] = []
  for (const declaration of style.split(';')) {
    const separator = declaration.indexOf(':')
    if (separator === -1) continue
    const property = declaration.slice(0, separator).trim().toLowerCase()
    const value = declaration.slice(separator + 1).trim().toLowerCase()
    const pattern = ALLOWED_STYLE[property]
    if (pattern && pattern.test(value)) {
      safe.push(`${property}: ${value}`)
    }
  }
  return safe.join('; ')
}

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
    if (node.hasAttribute('style')) {
      const safeStyle = filterStyleAttribute(node.getAttribute('style') || '')
      if (safeStyle) {
        node.setAttribute('style', safeStyle)
      } else {
        node.removeAttribute('style')
      }
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
      FORBID_ATTR: ['srcset', 'onerror', 'onload', 'onclick', 'onmouseover'],
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

export interface SanitizeUrlOptions {
  /**
   * When true, allows `data:` URLs (e.g. `data:audio/mpeg;base64,...`)
   * up to 20MB encoded, for use in media fields (cover, video, audio).
   * `javascript:` and other dangerous schemes are always rejected.
   */
  allowData?: boolean
}

/**
 * Maximum encoded length for allowed data: URLs (~20MB binary).
 * 20MB * (4/3) base64 expansion ≈ 27,972,000 characters.
 */
const MAX_DATA_URL_LENGTH = 27972000

/** Media types that can be interpreted as markup/scripts — never allowed, even with allowData. */
const FORBIDDEN_DATA_MEDIA_TYPES = ['html', 'xml', 'svg']

/** Extracts the lowercased media type from a data: URL ('' when absent). */
function getDataMediaType(dataUrl: string): string {
  const match = /^data:([^,]*),/i.exec(dataUrl)
  if (!match) return ''
  return match[1].split(';')[0].trim().toLowerCase()
}

/**
 * Validates and sanitizes URL inputs (avatar, cover, video, audio, etc.).
 * Strictly disallows dangerous schemes like javascript:, vbscript:, data:text/html.
 * `data:` URLs are only allowed when `opts.allowData` is true, guarded by a size limit.
 */
export function sanitizeUrl(url: string | null | undefined, opts?: SanitizeUrlOptions): string {
  if (!url) return ''
  const trimmed = url.trim()
  if (!trimmed) return ''

  const allowData = opts?.allowData === true

  // Allow safe relative URLs starting with / (excluding //protocol-relative)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed
  }

  // Allow data: URLs only when explicitly requested, within the size guard,
  // and never for HTML-capable media types.
  if (allowData && /^data:/i.test(trimmed)) {
    if (trimmed.length > MAX_DATA_URL_LENGTH) return ''
    const mediaType = getDataMediaType(trimmed)
    if (FORBIDDEN_DATA_MEDIA_TYPES.some((t) => mediaType.includes(t))) return ''
    try {
      const parsed = new URL(trimmed)
      if (parsed.protocol.toLowerCase() === 'data:') {
        return trimmed
      }
    } catch {
      return ''
    }
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
