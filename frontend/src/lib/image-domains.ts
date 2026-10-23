export const DEFAULT_ALLOWED_IMAGE_DOMAINS = [
  'images.unsplash.com',
  'images.pexels.com',
  'res.cloudinary.com',
  'cdn.jsdelivr.net',
  'picsum.photos',
]

/**
 * Extracts and normalizes hostname from URL.
 */
export function extractDomain(url: string | null | undefined): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed || trimmed.startsWith('/') || trimmed.startsWith('data:')) {
    return null
  }
  try {
    const parsed = new URL(trimmed)
    return parsed.hostname.toLowerCase()
  } catch {
    return null
  }
}

/**
 * Validates whether an image URL is allowed based on the allowed domains list.
 * Local paths (/...) and data URLs (data:image/...) from direct file uploads are always allowed.
 */
export function isAllowedImageDomain(
  url: string | null | undefined,
  allowedDomains: string[] = DEFAULT_ALLOWED_IMAGE_DOMAINS,
): boolean {
  if (!url) return false
  const trimmed = url.trim()
  if (!trimmed) return false

  // Local uploads or data URLs are always permitted
  if (
    (trimmed.startsWith('/') && !trimmed.startsWith('//')) ||
    trimmed.startsWith('data:image/')
  ) {
    return true
  }

  const hostname = extractDomain(trimmed)
  if (!hostname) return false

  const domains = allowedDomains.length ? allowedDomains : DEFAULT_ALLOWED_IMAGE_DOMAINS

  return domains.some((allowed) => {
    const clean = allowed.trim().toLowerCase()
    return hostname === clean || hostname.endsWith(`.${clean}`)
  })
}
